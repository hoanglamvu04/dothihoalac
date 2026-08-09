import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env.js';

const GOOGLE_AUTHORIZATION_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';
const GOOGLE_REVOKE_ENDPOINT = 'https://oauth2.googleapis.com/revoke';
const GOOGLE_USERINFO_ENDPOINT = 'https://openidconnect.googleapis.com/v1/userinfo';
const GOOGLE_DRIVE_ABOUT_ENDPOINT = 'https://www.googleapis.com/drive/v3/about';
const GOOGLE_DRIVE_FILES_ENDPOINT = 'https://www.googleapis.com/drive/v3/files';
const GOOGLE_DOCS_DOCUMENTS_ENDPOINT = 'https://docs.googleapis.com/v1/documents';
const GOOGLE_FOLDER_MIME = 'application/vnd.google-apps.folder';
const GOOGLE_DOCUMENT_MIME = 'application/vnd.google-apps.document';

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

const configuredValues = () => ({
  projectId: String(process.env.GOOGLE_PROJECT_ID || '').trim(),
  clientId: String(process.env.GOOGLE_OAUTH_CLIENT_ID || '').trim(),
  clientSecret: String(process.env.GOOGLE_OAUTH_CLIENT_SECRET || '').trim(),
  redirectUri: String(process.env.GOOGLE_OAUTH_REDIRECT_URI || '').trim(),
  allowedDomain: String(process.env.GOOGLE_WORKSPACE_ALLOWED_DOMAIN || '').trim().toLowerCase(),
  encryptionKey: String(process.env.GOOGLE_TOKEN_ENCRYPTION_KEY || '').trim(),
});

const decodeEncryptionKey = (value) => {
  if (/^[0-9a-f]{64}$/i.test(value)) return Buffer.from(value, 'hex');
  try {
    const decoded = Buffer.from(value, 'base64');
    return decoded.length === 32 ? decoded : null;
  } catch {
    return null;
  }
};

export function getGoogleWorkspaceConfigStatus() {
  const values = configuredValues();
  const required = {
    GOOGLE_OAUTH_CLIENT_ID: values.clientId,
    GOOGLE_OAUTH_CLIENT_SECRET: values.clientSecret,
    GOOGLE_OAUTH_REDIRECT_URI: values.redirectUri,
    GOOGLE_TOKEN_ENCRYPTION_KEY: values.encryptionKey,
  };
  const missing = Object.entries(required)
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (values.encryptionKey && !decodeEncryptionKey(values.encryptionKey)) {
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

export function assertGoogleWorkspaceConfigured() {
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

function getEncryptionKey() {
  const { encryptionKey } = assertGoogleWorkspaceConfigured();
  const decoded = decodeEncryptionKey(encryptionKey);
  if (decoded) return decoded;
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
  const cipher = crypto.createCipheriv('aes-256-gcm', getEncryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [
    'v1',
    iv.toString('base64url'),
    authTag.toString('base64url'),
    ciphertext.toString('base64url'),
  ].join('.');
}

export function decryptGoogleSecret(encryptedValue) {
  const value = String(encryptedValue || '');
  if (!value) return '';
  const [version, ivValue, authTagValue, ciphertextValue] = value.split('.');
  if (version !== 'v1' || !ivValue || !authTagValue || !ciphertextValue) {
    throw new GoogleWorkspaceError(
      'Refresh token đã lưu không đúng định dạng mã hóa.',
      'GOOGLE_TOKEN_DECRYPT_FAILED',
      500,
    );
  }
  try {
    const decipher = crypto.createDecipheriv(
      'aes-256-gcm',
      getEncryptionKey(),
      Buffer.from(ivValue, 'base64url'),
    );
    decipher.setAuthTag(Buffer.from(authTagValue, 'base64url'));
    return Buffer.concat([
      decipher.update(Buffer.from(ciphertextValue, 'base64url')),
      decipher.final(),
    ]).toString('utf8');
  } catch {
    throw new GoogleWorkspaceError(
      'Không giải mã được refresh token. Hãy kiểm tra GOOGLE_TOKEN_ENCRYPTION_KEY.',
      'GOOGLE_TOKEN_DECRYPT_FAILED',
      500,
    );
  }
}

async function parseGoogleResponse(response, fallbackMessage) {
  const contentType = response.headers.get('content-type') || '';
  const payload = contentType.includes('application/json')
    ? await response.json().catch(() => ({}))
    : await response.text().catch(() => '');
  if (response.ok) return payload;
  const googleMessage = typeof payload === 'object'
    ? payload?.error_description || payload?.error?.message || payload?.error
    : payload;
  throw new GoogleWorkspaceError(
    String(googleMessage || fallbackMessage || 'Google API trả về lỗi.').slice(0, 500),
    'GOOGLE_API_REQUEST_FAILED',
    response.status >= 400 && response.status < 500 ? 400 : 502,
  );
}

async function postGoogleForm(url, values, fallbackMessage) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(values),
  });
  return parseGoogleResponse(response, fallbackMessage);
}

async function googleBearerRequest(
  url,
  accessToken,
  { method = 'GET', body, fallbackMessage = 'Google API trả về lỗi.' } = {},
) {
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

export function createGoogleOAuthState(userId) {
  return jwt.sign(
    {
      type: 'dthl-google-workspace-oauth',
      userId: String(userId),
      nonce: crypto.randomBytes(18).toString('base64url'),
    },
    env.JWT_ACCESS_SECRET,
    {
      expiresIn: '10m',
      issuer: 'dothihoalac-api',
      audience: 'google-workspace-oauth',
    },
  );
}

export function verifyGoogleOAuthState(state) {
  try {
    const payload = jwt.verify(String(state || ''), env.JWT_ACCESS_SECRET, {
      issuer: 'dothihoalac-api',
      audience: 'google-workspace-oauth',
    });
    if (payload?.type !== 'dthl-google-workspace-oauth' || !payload?.userId) {
      throw new Error('invalid state payload');
    }
    return payload;
  } catch {
    throw new GoogleWorkspaceError(
      'Phiên kết nối Google đã hết hạn hoặc không hợp lệ. Hãy kết nối lại.',
      'GOOGLE_OAUTH_STATE_INVALID',
      400,
    );
  }
}

export function createGoogleAuthorizationUrl(state) {
  const config = assertGoogleWorkspaceConfigured();
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
  const config = assertGoogleWorkspaceConfigured();
  if (!code) {
    throw new GoogleWorkspaceError('Google không trả về authorization code.', 'GOOGLE_OAUTH_CODE_MISSING', 400);
  }
  return postGoogleForm(
    GOOGLE_TOKEN_ENDPOINT,
    {
      code: String(code),
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: config.redirectUri,
      grant_type: 'authorization_code',
    },
    'Không thể đổi authorization code lấy Google token.',
  );
}

export async function refreshGoogleAccessToken(refreshToken) {
  const config = assertGoogleWorkspaceConfigured();
  if (!refreshToken) {
    throw new GoogleWorkspaceError('Không có refresh token Google.', 'GOOGLE_REFRESH_TOKEN_MISSING', 400);
  }
  const result = await postGoogleForm(
    GOOGLE_TOKEN_ENDPOINT,
    {
      refresh_token: String(refreshToken),
      client_id: config.clientId,
      client_secret: config.clientSecret,
      grant_type: 'refresh_token',
    },
    'Không thể làm mới Google access token.',
  );
  if (!result?.access_token) {
    throw new GoogleWorkspaceError('Google không trả về access token mới.', 'GOOGLE_ACCESS_TOKEN_MISSING', 502);
  }
  return result;
}

export async function revokeGoogleToken(token) {
  if (!token) return;
  const response = await fetch(GOOGLE_REVOKE_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ token: String(token) }),
  });
  if (!response.ok && response.status !== 400) {
    throw new GoogleWorkspaceError('Không thể thu hồi Google token.', 'GOOGLE_REVOKE_FAILED', 502);
  }
}

export function getGoogleUserInfo(accessToken) {
  return googleBearerRequest(GOOGLE_USERINFO_ENDPOINT, accessToken, {
    fallbackMessage: 'Không đọc được thông tin tài khoản Google.',
  });
}

export async function assertAllowedGoogleAccount(userInfo) {
  const config = assertGoogleWorkspaceConfigured();
  const email = String(userInfo?.email || '').trim().toLowerCase();
  if (!email) {
    throw new GoogleWorkspaceError('Google không trả về email tài khoản.', 'GOOGLE_ACCOUNT_EMAIL_MISSING', 400);
  }
  if (config.allowedDomain && !email.endsWith(`@${config.allowedDomain}`)) {
    throw new GoogleWorkspaceError(
      `Chỉ chấp nhận tài khoản thuộc miền ${config.allowedDomain}.`,
      'GOOGLE_ACCOUNT_DOMAIN_NOT_ALLOWED',
      403,
    );
  }
  return email;
}

export function getGoogleDriveAbout(accessToken) {
  const url = new URL(GOOGLE_DRIVE_ABOUT_ENDPOINT);
  url.searchParams.set('fields', 'user(displayName,emailAddress,photoLink,permissionId),storageQuota(limit,usage)');
  return googleBearerRequest(url.toString(), accessToken, {
    fallbackMessage: 'Không kiểm tra được Google Drive API.',
  });
}

const driveFileFields = [
  'id',
  'name',
  'mimeType',
  'parents',
  'trashed',
  'webViewLink',
  'createdTime',
  'modifiedTime',
  'appProperties',
].join(',');

const escapeDriveQueryValue = (value) => String(value || '')
  .replaceAll('\\', '\\\\')
  .replaceAll("'", "\\'");

export async function getGoogleDriveFile(accessToken, fileId) {
  if (!fileId) return null;
  const url = new URL(`${GOOGLE_DRIVE_FILES_ENDPOINT}/${encodeURIComponent(fileId)}`);
  url.searchParams.set('fields', driveFileFields);
  url.searchParams.set('supportsAllDrives', 'true');
  try {
    return await googleBearerRequest(url.toString(), accessToken, {
      fallbackMessage: 'Không đọc được tệp Google Drive.',
    });
  } catch (error) {
    if (error instanceof GoogleWorkspaceError && error.status === 400) return null;
    throw error;
  }
}

export async function findManagedFolder(
  accessToken,
  { name, parentId = '', role, year = '' },
) {
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
  const result = await googleBearerRequest(url.toString(), accessToken, {
    fallbackMessage: 'Không tìm được thư mục Google Drive.',
  });
  return Array.isArray(result?.files) ? result.files[0] || null : null;
}

export async function createGoogleDriveFolder(
  accessToken,
  { name, parentId = '', role, year = '' },
) {
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
    fallbackMessage: 'Không tạo được thư mục Google Drive.',
  });
}

export async function ensureGoogleDriveFolder(accessToken, options) {
  const existing = await findManagedFolder(accessToken, options);
  if (existing) return existing;
  return createGoogleDriveFolder(accessToken, options);
}

export async function findGoogleDriveDocumentByContent(accessToken, contentId) {
  const url = new URL(GOOGLE_DRIVE_FILES_ENDPOINT);
  const queries = [
    `mimeType='${GOOGLE_DOCUMENT_MIME}'`,
    'trashed=false',
    "appProperties has { key='dthlManaged' and value='true' }",
    `appProperties has { key='dthlContentId' and value='${escapeDriveQueryValue(contentId)}' }`,
  ];
  url.searchParams.set('q', queries.join(' and '));
  url.searchParams.set('spaces', 'drive');
  url.searchParams.set('pageSize', '10');
  url.searchParams.set('fields', `files(${driveFileFields})`);
  const result = await googleBearerRequest(url.toString(), accessToken, {
    fallbackMessage: 'Không tìm được Google Docs của bài viết.',
  });
  return Array.isArray(result?.files) ? result.files[0] || null : null;
}

export async function createGoogleDriveDocument(
  accessToken,
  { name, parentId, contentId, documentCode, year },
) {
  const url = new URL(GOOGLE_DRIVE_FILES_ENDPOINT);
  url.searchParams.set('fields', driveFileFields);
  return googleBearerRequest(url.toString(), accessToken, {
    method: 'POST',
    body: {
      name,
      mimeType: GOOGLE_DOCUMENT_MIME,
      ...(parentId ? { parents: [parentId] } : {}),
      appProperties: {
        dthlManaged: 'true',
        dthlRole: 'article',
        dthlContentId: String(contentId),
        dthlDocumentCode: String(documentCode || ''),
        dthlYear: String(year || ''),
      },
    },
    fallbackMessage: 'Không tạo được Google Docs cho bài viết.',
  });
}

export function getGoogleDocsDocument(accessToken, documentId) {
  const url = `${GOOGLE_DOCS_DOCUMENTS_ENDPOINT}/${encodeURIComponent(documentId)}`;
  return googleBearerRequest(url, accessToken, {
    fallbackMessage: 'Không đọc được nội dung Google Docs.',
  });
}

export async function populateGoogleDocsDocument(
  accessToken,
  documentId,
  { title = '', summary = '', bodyText = '' } = {},
) {
  const safeTitle = String(title || '').trim() || 'Bài viết mới';
  const safeSummary = String(summary || '').trim();
  const safeBody = String(bodyText || '').trim();
  const intro = [safeTitle, safeSummary, safeBody].filter(Boolean).join('\n\n');
  const url = `${GOOGLE_DOCS_DOCUMENTS_ENDPOINT}/${encodeURIComponent(documentId)}:batchUpdate`;
  const titleEnd = safeTitle.length + 1;
  const requests = [
    { insertText: { location: { index: 1 }, text: `${intro}\n` } },
    {
      updateParagraphStyle: {
        range: { startIndex: 1, endIndex: titleEnd },
        paragraphStyle: { namedStyleType: 'TITLE' },
        fields: 'namedStyleType',
      },
    },
  ];
  return googleBearerRequest(url, accessToken, {
    method: 'POST',
    body: { requests },
    fallbackMessage: 'Không ghi được nội dung khởi tạo vào Google Docs.',
  });
}

export function googleDocUrl(documentId) {
  return documentId
    ? `https://docs.google.com/document/d/${encodeURIComponent(documentId)}/edit`
    : '';
}

function paragraphText(paragraph) {
  return (paragraph?.elements || [])
    .map((element) => String(element?.textRun?.content || ''))
    .join('')
    .replace(/\n+$/g, '')
    .trim();
}

function paragraphInlineObjectIds(paragraph) {
  return (paragraph?.elements || [])
    .map((element) => element?.inlineObjectElement?.inlineObjectId)
    .filter(Boolean);
}

function googleListType(document, paragraph) {
  const listId = paragraph?.bullet?.listId;
  if (!listId) return '';
  const nestingLevel = Number(paragraph?.bullet?.nestingLevel || 0);
  const level = document?.lists?.[listId]?.listProperties?.nestingLevels?.[nestingLevel];
  const glyphType = String(level?.glyphType || '').toUpperCase();
  return glyphType.includes('DECIMAL') || glyphType.includes('ALPHA') || glyphType.includes('ROMAN')
    ? 'ol'
    : 'ul';
}

export function parseGoogleDocsArticle(document) {
  const rows = [];
  for (const structuralElement of document?.body?.content || []) {
    const paragraph = structuralElement?.paragraph;
    if (!paragraph) continue;
    const text = paragraphText(paragraph);
    const imageObjectIds = paragraphInlineObjectIds(paragraph);
    const namedStyle = String(paragraph?.paragraphStyle?.namedStyleType || 'NORMAL_TEXT').toUpperCase();
    if (text) {
      rows.push({
        text,
        namedStyle,
        listType: googleListType(document, paragraph),
        imageObjectIds: [],
      });
    }
    imageObjectIds.forEach((objectId) => rows.push({
      text: '',
      namedStyle: 'IMAGE',
      listType: '',
      imageObjectIds: [objectId],
    }));
  }

  if (!rows.length) {
    throw new GoogleWorkspaceError('Google Docs đang trống. Hãy viết nội dung rồi đồng bộ lại.', 'GOOGLE_DOC_EMPTY', 400);
  }

  let titleIndex = rows.findIndex((row) => row.text && (row.namedStyle === 'TITLE' || row.namedStyle === 'HEADING_1'));
  if (titleIndex < 0) titleIndex = rows.findIndex((row) => row.text);
  const title = String(rows[titleIndex]?.text || '').replace(/\s+/g, ' ').trim().slice(0, 250);
  if (title.length < 5) {
    throw new GoogleWorkspaceError('Tiêu đề trong Google Docs quá ngắn.', 'GOOGLE_DOC_TITLE_INVALID', 400);
  }

  const blocks = [];
  for (const [index, row] of rows.entries()) {
    if (index === titleIndex) continue;
    if (row.imageObjectIds.length) {
      blocks.push({ type: 'image', objectId: row.imageObjectIds[0] });
      continue;
    }
    if (row.listType) {
      const previous = blocks[blocks.length - 1];
      if (previous?.type === row.listType) previous.items.push(row.text);
      else blocks.push({ type: row.listType, items: [row.text] });
      continue;
    }
    let type = 'p';
    if (row.namedStyle === 'HEADING_2') type = 'h2';
    else if (row.namedStyle === 'HEADING_3' || row.namedStyle === 'HEADING_4') type = 'h3';
    else if (row.namedStyle === 'SUBTITLE') type = 'p';
    blocks.push({ type, text: row.text });
  }

  const firstParagraph = blocks.find((block) => block.type === 'p' && String(block.text || '').trim().length >= 20);
  const summary = String(firstParagraph?.text || '').replace(/\s+/g, ' ').trim().slice(0, 600);
  return { title, summary, blocks };
}

export function getGoogleInlineImage(document, objectId) {
  const embedded = document?.inlineObjects?.[objectId]?.inlineObjectProperties?.embeddedObject;
  const properties = embedded?.imageProperties || {};
  return {
    objectId,
    contentUri: properties.contentUri || '',
    sourceUri: properties.sourceUri || '',
    title: embedded?.title || '',
    description: embedded?.description || '',
  };
}

export async function downloadGoogleImage(accessToken, url) {
  if (!url) throw new GoogleWorkspaceError('Google Docs không trả về URL ảnh.', 'GOOGLE_DOC_IMAGE_URL_MISSING', 400);
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) {
    throw new GoogleWorkspaceError('Không tải được ảnh từ Google Docs.', 'GOOGLE_DOC_IMAGE_DOWNLOAD_FAILED', 502);
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  const contentType = response.headers.get('content-type') || 'image/jpeg';
  return { buffer, contentType };
}
