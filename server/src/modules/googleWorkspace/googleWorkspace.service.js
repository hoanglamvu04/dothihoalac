import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';

import { env } from '../../config/env.js';
import { GoogleWorkspaceConnection } from './googleWorkspace.model.js';

const GOOGLE_AUTHORIZATION_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';
const GOOGLE_REVOKE_ENDPOINT = 'https://oauth2.googleapis.com/revoke';
const GOOGLE_USERINFO_ENDPOINT = 'https://openidconnect.googleapis.com/v1/userinfo';
const GOOGLE_DRIVE_ABOUT_ENDPOINT = 'https://www.googleapis.com/drive/v3/about';
const GOOGLE_DRIVE_FILES_ENDPOINT = 'https://www.googleapis.com/drive/v3/files';
const GOOGLE_DOCS_DOCUMENTS_ENDPOINT = 'https://docs.googleapis.com/v1/documents';
const GOOGLE_FOLDER_MIME = 'application/vnd.google-apps.folder';
const GOOGLE_DOCUMENT_MIME = 'application/vnd.google-apps.document';

const ROOT_FOLDER_NAME = 'DTHL - NỘI DUNG WEBSITE';
const CONNECTION_KEY = 'primary';

const FOLDER_DEFINITIONS = [
  ['templateFolderId', '00_MẪU_TÀI_LIỆU', 'templates'],
  ['draftFolderId', '01_ĐANG_SOẠN', 'drafts'],
  ['reviewFolderId', '02_CHỜ_DUYỆT', 'review'],
  ['publishedFolderId', '03_ĐÃ_XUẤT_BẢN', 'published'],
  ['archiveFolderId', '99_LƯU_TRỮ', 'archive'],
];

export const GOOGLE_WORKSPACE_SCOPES = [
  'openid',
  'email',
  'profile',
  'https://www.googleapis.com/auth/drive.file',
];

export class GoogleWorkspaceError extends Error {
  constructor(message, code = 'GOOGLE_WORKSPACE_ERROR', status = 500) {
    super(message);
    this.name = 'GoogleWorkspaceError';
    this.code = code;
    this.status = status;
  }
}

function configuredValues() {
  return {
    projectId: String(env.GOOGLE_PROJECT_ID || '').trim(),
    clientId: String(env.GOOGLE_OAUTH_CLIENT_ID || '').trim(),
    clientSecret: String(env.GOOGLE_OAUTH_CLIENT_SECRET || '').trim(),
    redirectUri: String(env.GOOGLE_OAUTH_REDIRECT_URI || '').trim(),
    allowedDomain: String(env.GOOGLE_WORKSPACE_ALLOWED_DOMAIN || '').trim().toLowerCase(),
    encryptionKey: String(env.GOOGLE_TOKEN_ENCRYPTION_KEY || '').trim(),
  };
}

function validEncryptionKey(value) {
  if (/^[0-9a-f]{64}$/i.test(value)) return true;
  try {
    return Buffer.from(value, 'base64').length === 32;
  } catch {
    return false;
  }
}

export function getGoogleWorkspaceConfigStatus() {
  const values = configuredValues();
  const required = {
    GOOGLE_OAUTH_CLIENT_ID: values.clientId,
    GOOGLE_OAUTH_CLIENT_SECRET: values.clientSecret,
    GOOGLE_OAUTH_REDIRECT_URI: values.redirectUri,
    GOOGLE_WORKSPACE_ALLOWED_DOMAIN: values.allowedDomain,
    GOOGLE_TOKEN_ENCRYPTION_KEY: values.encryptionKey,
  };
  const missing = Object.entries(required).filter(([, value]) => !value).map(([key]) => key);
  if (values.encryptionKey && !validEncryptionKey(values.encryptionKey)) {
    missing.push('GOOGLE_TOKEN_ENCRYPTION_KEY_INVALID');
  }
  return {
    configured: missing.length === 0,
    missing,
    projectId: values.projectId,
    redirectUri: values.redirectUri,
    allowedDomain: values.allowedDomain,
  };
}

function assertConfigured() {
  const status = getGoogleWorkspaceConfigStatus();
  if (!status.configured) {
    throw new GoogleWorkspaceError(
      `Google Workspace chưa được cấu hình đầy đủ: ${status.missing.join(', ')}`,
      'GOOGLE_WORKSPACE_NOT_CONFIGURED',
      503,
    );
  }
  return configuredValues();
}

function encryptionKey() {
  const value = assertConfigured().encryptionKey;
  if (/^[0-9a-f]{64}$/i.test(value)) return Buffer.from(value, 'hex');
  const decoded = Buffer.from(value, 'base64');
  if (decoded.length === 32) return decoded;
  throw new GoogleWorkspaceError(
    'GOOGLE_TOKEN_ENCRYPTION_KEY phải là 64 ký tự hex hoặc base64 của đúng 32 byte.',
    'GOOGLE_TOKEN_ENCRYPTION_KEY_INVALID',
    503,
  );
}

export function encryptGoogleSecret(plaintext) {
  const value = String(plaintext || '');
  if (!value) return '';
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', encryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return ['v1', iv.toString('base64url'), authTag.toString('base64url'), ciphertext.toString('base64url')].join('.');
}

export function decryptGoogleSecret(encryptedValue) {
  const value = String(encryptedValue || '');
  if (!value) return '';
  const [version, ivValue, authTagValue, ciphertextValue] = value.split('.');
  if (version !== 'v1' || !ivValue || !authTagValue || !ciphertextValue) {
    throw new GoogleWorkspaceError('Refresh token Google không đúng định dạng mã hóa.', 'GOOGLE_TOKEN_DECRYPT_FAILED', 500);
  }
  try {
    const decipher = crypto.createDecipheriv('aes-256-gcm', encryptionKey(), Buffer.from(ivValue, 'base64url'));
    decipher.setAuthTag(Buffer.from(authTagValue, 'base64url'));
    return Buffer.concat([
      decipher.update(Buffer.from(ciphertextValue, 'base64url')),
      decipher.final(),
    ]).toString('utf8');
  } catch {
    throw new GoogleWorkspaceError('Không giải mã được refresh token Google.', 'GOOGLE_TOKEN_DECRYPT_FAILED', 500);
  }
}

async function parseGoogleResponse(response, fallbackMessage) {
  const contentType = response.headers.get('content-type') || '';
  const payload = contentType.includes('application/json')
    ? await response.json().catch(() => ({}))
    : await response.text().catch(() => '');

  if (response.ok) return payload;

  const detail = typeof payload === 'object'
    ? payload?.error_description || payload?.error?.message || payload?.error
    : payload;

  throw new GoogleWorkspaceError(
    String(detail || fallbackMessage || 'Google API trả về lỗi.').slice(0, 500),
    'GOOGLE_API_REQUEST_FAILED',
    response.status >= 400 && response.status < 500 ? 400 : 502,
  );
}

async function googleBearerRequest(url, accessToken, { method = 'GET', body, fallbackMessage } = {}) {
  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  return parseGoogleResponse(response, fallbackMessage);
}

export function createGoogleOAuthState(userId, clientOrigin = '') {
  const origin = (() => {
    try { return new URL(clientOrigin || env.CLIENT_URL).origin; } catch { return new URL(env.CLIENT_URL).origin; }
  })();

  return jwt.sign(
    {
      type: 'google-workspace-oauth',
      userId: String(userId),
      clientOrigin: origin,
      nonce: crypto.randomBytes(18).toString('base64url'),
    },
    env.JWT_ACCESS_SECRET,
    { expiresIn: '10m', issuer: 'dothihoalac-api', audience: 'google-workspace-oauth' },
  );
}

export function verifyGoogleOAuthState(state) {
  try {
    const payload = jwt.verify(String(state || ''), env.JWT_ACCESS_SECRET, {
      issuer: 'dothihoalac-api',
      audience: 'google-workspace-oauth',
    });
    if (payload?.type !== 'google-workspace-oauth' || !payload?.userId) throw new Error('invalid payload');
    return payload;
  } catch {
    throw new GoogleWorkspaceError('Phiên kết nối Google đã hết hạn hoặc không hợp lệ.', 'GOOGLE_OAUTH_STATE_INVALID', 400);
  }
}

export function createGoogleAuthorizationUrl(state) {
  const config = assertConfigured();
  const url = new URL(GOOGLE_AUTHORIZATION_ENDPOINT);
  url.searchParams.set('client_id', config.clientId);
  url.searchParams.set('redirect_uri', config.redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', GOOGLE_WORKSPACE_SCOPES.join(' '));
  url.searchParams.set('access_type', 'offline');
  url.searchParams.set('include_granted_scopes', 'true');
  url.searchParams.set('prompt', 'consent');
  url.searchParams.set('state', state);
  if (config.allowedDomain) url.searchParams.set('hd', config.allowedDomain);
  return url.toString();
}

export async function exchangeGoogleAuthorizationCode(code) {
  const config = assertConfigured();
  const response = await fetch(GOOGLE_TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code: String(code || ''),
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: config.redirectUri,
      grant_type: 'authorization_code',
    }),
  });
  return parseGoogleResponse(response, 'Không thể đổi authorization code lấy Google token.');
}

export async function refreshGoogleAccessToken(refreshToken) {
  const config = assertConfigured();
  const response = await fetch(GOOGLE_TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: String(refreshToken || ''),
      client_id: config.clientId,
      client_secret: config.clientSecret,
      grant_type: 'refresh_token',
    }),
  });
  const data = await parseGoogleResponse(response, 'Không thể làm mới Google access token.');
  if (!data?.access_token) {
    throw new GoogleWorkspaceError('Google không trả về access token mới.', 'GOOGLE_ACCESS_TOKEN_MISSING', 502);
  }
  return data;
}

export async function revokeGoogleToken(token) {
  if (!token) return;
  const response = await fetch(GOOGLE_REVOKE_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ token: String(token) }),
  });
  if (!response.ok && response.status !== 400) {
    await parseGoogleResponse(response, 'Không thể thu hồi Google token.');
  }
}

export async function getGoogleUserInfo(accessToken) {
  return googleBearerRequest(GOOGLE_USERINFO_ENDPOINT, accessToken, {
    fallbackMessage: 'Không đọc được thông tin tài khoản Google.',
  });
}

export function assertAllowedGoogleAccount(userInfo) {
  const domain = assertConfigured().allowedDomain;
  const email = String(userInfo?.email || '').trim().toLowerCase();
  if (!email || userInfo?.email_verified === false || !email.endsWith(`@${domain}`)) {
    throw new GoogleWorkspaceError(
      `Chỉ tài khoản Google Workspace thuộc miền ${domain} được phép kết nối.`,
      'GOOGLE_ACCOUNT_DOMAIN_FORBIDDEN',
      403,
    );
  }
  return email;
}

export async function getGoogleDriveAbout(accessToken) {
  const url = new URL(GOOGLE_DRIVE_ABOUT_ENDPOINT);
  url.searchParams.set('fields', 'user(displayName,emailAddress,photoLink,permissionId),storageQuota(limit,usage)');
  return googleBearerRequest(url.toString(), accessToken, {
    fallbackMessage: 'Không kiểm tra được Google Drive API.',
  });
}

export async function loadConnectedGoogle() {
  assertConfigured();
  const connection = await GoogleWorkspaceConnection.findOne({
    key: CONNECTION_KEY,
    connected: true,
  }).select('+refreshTokenEncrypted');

  if (!connection?.refreshTokenEncrypted) {
    throw new GoogleWorkspaceError('Google Workspace chưa được kết nối.', 'GOOGLE_WORKSPACE_NOT_CONNECTED', 409);
  }

  const refreshToken = decryptGoogleSecret(connection.refreshTokenEncrypted);
  const tokenData = await refreshGoogleAccessToken(refreshToken);
  return { connection, accessToken: tokenData.access_token, refreshToken };
}

const driveFileFields = [
  'id', 'name', 'mimeType', 'parents', 'driveId', 'trashed', 'webViewLink',
  'createdTime', 'modifiedTime', 'appProperties',
].join(',');

function escapeDriveQueryValue(value) {
  return String(value || '').replaceAll('\\', '\\\\').replaceAll("'", "\\'");
}

export async function getGoogleDriveFile(accessToken, fileId) {
  if (!fileId) return null;
  const url = new URL(`${GOOGLE_DRIVE_FILES_ENDPOINT}/${encodeURIComponent(fileId)}`);
  url.searchParams.set('fields', driveFileFields);
  url.searchParams.set('supportsAllDrives', 'true');
  try {
    return await googleBearerRequest(url.toString(), accessToken, { fallbackMessage: 'Không đọc được tệp Google Drive.' });
  } catch (error) {
    if (error instanceof GoogleWorkspaceError && error.status === 400) return null;
    throw error;
  }
}

async function findManagedFolder(accessToken, { name, parentId = '', role, year = '' }) {
  const url = new URL(GOOGLE_DRIVE_FILES_ENDPOINT);
  const queries = [
    `mimeType='${GOOGLE_FOLDER_MIME}'`,
    'trashed=false',
    `name='${escapeDriveQueryValue(name)}'`,
    "appProperties has { key='dthlManaged' and value='true' }",
    `appProperties has { key='dthlRole' and value='${escapeDriveQueryValue(role)}' }`,
  ];
  if (parentId) queries.push(`'${escapeDriveQueryValue(parentId)}' in parents`);
  if (year) queries.push(`appProperties has { key='dthlYear' and value='${escapeDriveQueryValue(year)}' }`);
  url.searchParams.set('q', queries.join(' and '));
  url.searchParams.set('spaces', 'drive');
  url.searchParams.set('pageSize', '10');
  url.searchParams.set('fields', `files(${driveFileFields})`);
  url.searchParams.set('orderBy', 'createdTime asc');
  const result = await googleBearerRequest(url.toString(), accessToken, { fallbackMessage: 'Không tìm được thư mục Google Drive.' });
  return Array.isArray(result?.files) ? result.files[0] || null : null;
}

async function createDriveFolder(accessToken, { name, parentId = '', role, year = '' }) {
  const url = new URL(GOOGLE_DRIVE_FILES_ENDPOINT);
  url.searchParams.set('fields', driveFileFields);
  const body = {
    name,
    mimeType: GOOGLE_FOLDER_MIME,
    appProperties: {
      dthlManaged: 'true',
      dthlRole: String(role),
      ...(year ? { dthlYear: String(year) } : {}),
    },
    ...(parentId ? { parents: [parentId] } : {}),
  };
  return googleBearerRequest(url.toString(), accessToken, {
    method: 'POST',
    body,
    fallbackMessage: `Không tạo được thư mục ${name}.`,
  });
}

async function ensureFolder(accessToken, options) {
  return (await findManagedFolder(accessToken, options)) || createDriveFolder(accessToken, options);
}

export function normalizeWorkspaceYear(value) {
  const current = new Date().getFullYear();
  const year = Number(value || current);
  if (!Number.isInteger(year) || year < 2020 || year > current + 5) {
    throw new GoogleWorkspaceError(`Năm thư mục phải nằm trong khoảng 2020-${current + 5}.`, 'GOOGLE_FOLDER_YEAR_INVALID', 400);
  }
  return year;
}

export async function ensureWorkspaceFolders(connection, accessToken, yearValue) {
  const year = normalizeWorkspaceYear(yearValue);
  let root = connection.rootFolderId ? await getGoogleDriveFile(accessToken, connection.rootFolderId) : null;
  if (!root || root.trashed || root.mimeType !== GOOGLE_FOLDER_MIME) {
    root = await ensureFolder(accessToken, { name: ROOT_FOLDER_NAME, role: 'root' });
  }

  const yearFolder = await ensureFolder(accessToken, {
    name: String(year),
    parentId: root.id,
    role: 'year',
    year,
  });

  const folderData = { year, yearFolderId: yearFolder.id };
  for (const [key, name, role] of FOLDER_DEFINITIONS) {
    const folder = await ensureFolder(accessToken, {
      name,
      parentId: yearFolder.id,
      role,
      year,
    });
    folderData[key] = folder.id;
  }

  folderData.setupAt = new Date();
  connection.rootFolderId = root.id;
  connection.rootFolderName = root.name || ROOT_FOLDER_NAME;
  connection.rootDriveId = root.driveId || '';
  connection.lastCheckedAt = new Date();
  connection.lastError = '';

  const index = connection.folderYears.findIndex((item) => Number(item.year) === year);
  if (index >= 0) connection.folderYears[index] = folderData;
  else connection.folderYears.push(folderData);
  await connection.save();

  return folderData;
}

export function driveFolderUrl(folderId) {
  return folderId ? `https://drive.google.com/drive/folders/${encodeURIComponent(folderId)}` : '';
}

export function googleDocUrl(documentId) {
  return documentId ? `https://docs.google.com/document/d/${encodeURIComponent(documentId)}/edit` : '';
}

function serializeFolderYear(item) {
  if (!item) return null;
  const data = typeof item.toObject === 'function' ? item.toObject() : item;
  return {
    ...data,
    year: Number(data.year),
    yearFolderUrl: driveFolderUrl(data.yearFolderId),
    templateFolderUrl: driveFolderUrl(data.templateFolderId),
    draftFolderUrl: driveFolderUrl(data.draftFolderId),
    reviewFolderUrl: driveFolderUrl(data.reviewFolderId),
    publishedFolderUrl: driveFolderUrl(data.publishedFolderId),
    archiveFolderUrl: driveFolderUrl(data.archiveFolderId),
  };
}

export function safeConnection(connection) {
  if (!connection) return null;
  const data = typeof connection.toObject === 'function' ? connection.toObject() : connection;
  return {
    id: data._id,
    connected: Boolean(data.connected),
    email: data.email || '',
    displayName: data.displayName || '',
    picture: data.picture || '',
    googleAccountId: data.googleAccountId || '',
    scopes: data.scopes || [],
    drivePermissionId: data.drivePermissionId || '',
    connectedAt: data.connectedAt || null,
    lastCheckedAt: data.lastCheckedAt || null,
    lastError: data.lastError || '',
    rootFolderId: data.rootFolderId || '',
    rootFolderName: data.rootFolderName || '',
    rootFolderUrl: driveFolderUrl(data.rootFolderId),
    folderYears: (data.folderYears || []).map(serializeFolderYear).sort((a, b) => b.year - a.year),
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  };
}

export async function findGoogleDriveDocumentByArticle(accessToken, articleId) {
  const url = new URL(GOOGLE_DRIVE_FILES_ENDPOINT);
  const queries = [
    `mimeType='${GOOGLE_DOCUMENT_MIME}'`,
    'trashed=false',
    "appProperties has { key='dthlManaged' and value='true' }",
    `appProperties has { key='dthlArticleId' and value='${escapeDriveQueryValue(articleId)}' }`,
  ];
  url.searchParams.set('q', queries.join(' and '));
  url.searchParams.set('spaces', 'drive');
  url.searchParams.set('pageSize', '10');
  url.searchParams.set('fields', `files(${driveFileFields})`);
  const result = await googleBearerRequest(url.toString(), accessToken, { fallbackMessage: 'Không tìm được Google Docs của bài viết.' });
  return Array.isArray(result?.files) ? result.files[0] || null : null;
}

export async function createArticleGoogleDoc(accessToken, { articleId, folderId, fileName, initialText }) {
  const existing = await findGoogleDriveDocumentByArticle(accessToken, String(articleId));
  if (existing) return existing;

  const url = new URL(GOOGLE_DRIVE_FILES_ENDPOINT);
  url.searchParams.set('fields', driveFileFields);
  const file = await googleBearerRequest(url.toString(), accessToken, {
    method: 'POST',
    body: {
      name: String(fileName || 'DTHL - Bài viết').slice(0, 180),
      mimeType: GOOGLE_DOCUMENT_MIME,
      parents: folderId ? [folderId] : undefined,
      appProperties: {
        dthlManaged: 'true',
        dthlRole: 'article',
        dthlArticleId: String(articleId),
      },
    },
    fallbackMessage: 'Không tạo được Google Docs cho bài viết.',
  });

  if (initialText) {
    await googleBearerRequest(
      `${GOOGLE_DOCS_DOCUMENTS_ENDPOINT}/${encodeURIComponent(file.id)}:batchUpdate`,
      accessToken,
      {
        method: 'POST',
        body: {
          requests: [
            { insertText: { location: { index: 1 }, text: String(initialText) } },
          ],
        },
        fallbackMessage: 'Đã tạo Google Docs nhưng không điền được nội dung ban đầu.',
      },
    );
  }

  return { ...file, webViewLink: file.webViewLink || googleDocUrl(file.id) };
}

export async function getGoogleDocsDocument(accessToken, documentId) {
  return googleBearerRequest(
    `${GOOGLE_DOCS_DOCUMENTS_ENDPOINT}/${encodeURIComponent(documentId)}`,
    accessToken,
    { fallbackMessage: 'Không đọc được nội dung Google Docs.' },
  );
}

export async function moveGoogleDriveFile(accessToken, fileId, targetFolderId) {
  if (!fileId || !targetFolderId) return null;
  const current = await getGoogleDriveFile(accessToken, fileId);
  if (!current) return null;
  const parents = current.parents || [];
  if (parents.includes(targetFolderId)) return current;

  const url = new URL(`${GOOGLE_DRIVE_FILES_ENDPOINT}/${encodeURIComponent(fileId)}`);
  url.searchParams.set('addParents', targetFolderId);
  if (parents.length) url.searchParams.set('removeParents', parents.join(','));
  url.searchParams.set('fields', driveFileFields);
  return googleBearerRequest(url.toString(), accessToken, {
    method: 'PATCH',
    body: {},
    fallbackMessage: 'Không di chuyển được Google Docs sang thư mục trạng thái mới.',
  });
}

export function documentStatusForContent(status) {
  if (status === 'published') return 'published';
  if (['pending_review', 'approved'].includes(status)) return 'review';
  if (['hidden', 'rejected'].includes(status)) return 'archive';
  return 'draft';
}

export function folderIdForDocumentStatus(folderYear, status) {
  if (status === 'published') return folderYear?.publishedFolderId || '';
  if (status === 'review') return folderYear?.reviewFolderId || '';
  if (status === 'archive') return folderYear?.archiveFolderId || '';
  return folderYear?.draftFolderId || '';
}

function paragraphText(paragraph) {
  return (paragraph?.elements || [])
    .map((element) => String(element?.textRun?.content || ''))
    .join('')
    .replace(/\n+$/g, '')
    .trim();
}

function googleListType(document, paragraph) {
  const listId = paragraph?.bullet?.listId;
  if (!listId) return '';
  const nestingLevel = Number(paragraph?.bullet?.nestingLevel || 0);
  const level = document?.lists?.[listId]?.listProperties?.nestingLevels?.[nestingLevel];
  const glyphType = String(level?.glyphType || '').toUpperCase();
  return glyphType.includes('DECIMAL') || glyphType.includes('ALPHA') || glyphType.includes('ROMAN') ? 'ol' : 'ul';
}

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function blocksToHtml(blocks) {
  const html = [];
  let activeList = '';
  const closeList = () => {
    if (!activeList) return;
    html.push(`</${activeList}>`);
    activeList = '';
  };

  for (const block of blocks) {
    if (block.type === 'ul' || block.type === 'ol') {
      if (activeList !== block.type) {
        closeList();
        activeList = block.type;
        html.push(`<${activeList}>`);
      }
      html.push(`<li>${escapeHtml(block.text)}</li>`);
      continue;
    }
    closeList();
    if (block.type === 'h2') html.push(`<h2>${escapeHtml(block.text)}</h2>`);
    else if (block.type === 'h3') html.push(`<h3>${escapeHtml(block.text)}</h3>`);
    else html.push(`<p>${escapeHtml(block.text)}</p>`);
  }
  closeList();
  return html.join('\n');
}

export function parseGoogleDocsArticle(document) {
  const rows = [];
  for (const structuralElement of document?.body?.content || []) {
    const paragraph = structuralElement?.paragraph;
    if (!paragraph) continue;
    const text = paragraphText(paragraph);
    if (!text) continue;
    rows.push({
      text,
      namedStyle: String(paragraph?.paragraphStyle?.namedStyleType || 'NORMAL_TEXT').toUpperCase(),
      listType: googleListType(document, paragraph),
    });
  }

  if (!rows.length) {
    throw new GoogleWorkspaceError('Google Docs đang trống.', 'GOOGLE_DOC_EMPTY', 400);
  }

  let titleIndex = rows.findIndex((row) => row.namedStyle === 'TITLE' || row.namedStyle === 'HEADING_1');
  if (titleIndex < 0) titleIndex = 0;
  const title = String(rows[titleIndex]?.text || '').trim().slice(0, 250);
  if (title.length < 5) {
    throw new GoogleWorkspaceError('Tiêu đề trong Google Docs quá ngắn.', 'GOOGLE_DOC_TITLE_INVALID', 400);
  }

  const blocks = rows
    .filter((_, index) => index !== titleIndex)
    .map((row) => ({
      type: row.listType || (row.namedStyle === 'HEADING_2' ? 'h2' : row.namedStyle === 'HEADING_3' ? 'h3' : 'p'),
      text: row.text,
    }));

  if (!blocks.length) {
    throw new GoogleWorkspaceError('Google Docs mới có tiêu đề nhưng chưa có nội dung.', 'GOOGLE_DOC_CONTENT_EMPTY', 400);
  }

  const excerpt = String(
    blocks.find((block) => block.type === 'p' && block.text.length >= 20)?.text ||
    blocks.find((block) => block.type === 'p')?.text ||
    blocks[0]?.text || '',
  ).replace(/\s+/g, ' ').trim().slice(0, 320);

  return {
    title,
    summary: excerpt,
    bodyHtml: blocksToHtml(blocks),
  };
}
