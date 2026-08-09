import { Router } from 'express';

import { env } from '../../config/env.js';
import { requireAuth } from '../../middlewares/auth.middleware.js';
import { requirePermission } from '../../middlewares/role.middleware.js';
import { PERMISSIONS } from '../../constants/permissions.js';
import asyncHandler from '../../utils/asyncHandler.js';
import { sendCreated, sendSuccess } from '../../utils/apiResponse.js';
import Content from '../contents/content.model.js';
import ContentBody from '../contents/contentBody.model.js';
import Article from '../articles/article.model.js';
import * as articleService from '../articles/article.service.js';
import { adminArticleDetail } from '../articles/article.admin.detail.service.js';
import { updateContentWithBody } from '../contents/content.service.js';
import {
  GoogleDocumentCounter,
  GoogleWorkspaceConnection,
} from './googleWorkspace.model.js';
import {
  GoogleWorkspaceError,
  assertAllowedGoogleAccount,
  createArticleGoogleDoc,
  createGoogleAuthorizationUrl,
  createGoogleOAuthState,
  decryptGoogleSecret,
  documentStatusForContent,
  encryptGoogleSecret,
  ensureWorkspaceFolders,
  exchangeGoogleAuthorizationCode,
  findGoogleDriveDocumentByArticle,
  folderIdForDocumentStatus,
  getGoogleDocsDocument,
  getGoogleDriveAbout,
  getGoogleDriveFile,
  getGoogleUserInfo,
  getGoogleWorkspaceConfigStatus,
  googleDocUrl,
  loadConnectedGoogle,
  moveGoogleDriveFile,
  parseGoogleDocsArticle,
  refreshGoogleAccessToken,
  revokeGoogleToken,
  safeConnection,
  verifyGoogleOAuthState,
} from './googleWorkspace.service.js';

const router = Router();
const CONNECTION_KEY = 'primary';

function cleanClientOrigin(value) {
  try { return new URL(value || env.CLIENT_URL).origin; } catch { return new URL(env.CLIENT_URL).origin; }
}

function oauthRedirect(clientOrigin, params = {}) {
  const url = new URL('/quan-tri/google-workspace', cleanClientOrigin(clientOrigin));
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, String(value));
  });
  return url.toString();
}

function normalizeId(value) {
  return value?._id || value?.id || value || null;
}

function meaningfulHtml(value) {
  const html = String(value || '');
  return html.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').trim()
    ? html
    : '<p>Nội dung đang được soạn trong Google Docs.</p>';
}

async function nextDocumentCode() {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const key = `${yy}${mm}${dd}`;
  const counter = await GoogleDocumentCounter.findOneAndUpdate(
    { key },
    { $inc: { sequence: 1 } },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
  return `DTHL-${key}-${String(counter.sequence).padStart(3, '0')}`;
}

async function articleBundle(contentId) {
  const [content, body, article] = await Promise.all([
    Content.findOne({ _id: contentId, contentType: 'article', deletedAt: null }),
    ContentBody.findOne({ contentId }).lean(),
    Article.findOne({ contentId }),
  ]);
  if (!content || !article) {
    throw new GoogleWorkspaceError('Không tìm thấy bài viết để liên kết Google Docs.', 'ARTICLE_NOT_FOUND', 404);
  }
  return { content, body, article };
}

async function ensureArticleDocument(contentId) {
  const { content, body, article } = await articleBundle(contentId);
  const { connection, accessToken } = await loadConnectedGoogle();
  const year = Number(article.googleDocYear || new Date().getFullYear());
  const folders = await ensureWorkspaceFolders(connection, accessToken, year);
  const docStatus = documentStatusForContent(content.status);
  const targetFolderId = folderIdForDocumentStatus(folders, docStatus);

  let file = article.googleDocId ? await getGoogleDriveFile(accessToken, article.googleDocId) : null;
  if (!file) file = await findGoogleDriveDocumentByArticle(accessToken, String(content._id));

  const documentCode = article.documentCode || await nextDocumentCode();
  const fileName = `${documentCode} - ${String(content.title || 'Bài viết').trim()}`.slice(0, 180);

  if (!file) {
    const initialText = [
      content.title,
      content.summary,
      body?.bodyText || content.bodyText || 'Bắt đầu viết nội dung bài tại đây.',
    ].filter(Boolean).join('\n\n');
    file = await createArticleGoogleDoc(accessToken, {
      articleId: content._id,
      folderId: targetFolderId,
      fileName,
      initialText,
    });
  } else if (targetFolderId) {
    file = await moveGoogleDriveFile(accessToken, file.id, targetFolderId) || file;
  }

  article.documentCode = documentCode;
  article.googleDocId = file.id;
  article.googleDocUrl = file.webViewLink || googleDocUrl(file.id);
  article.googleDocFileName = file.name || fileName;
  article.googleDocFolderId = targetFolderId;
  article.googleDocStatus = docStatus;
  article.googleDocYear = year;
  await article.save();

  return {
    postId: String(content._id),
    documentCode,
    docId: file.id,
    docUrl: article.googleDocUrl,
    fileName: article.googleDocFileName,
    folderId: targetFolderId,
    status: docStatus,
    year,
  };
}

router.get(
  '/oauth/callback',
  asyncHandler(async (req, res) => {
    let clientOrigin = env.CLIENT_URL;
    try {
      const state = verifyGoogleOAuthState(req.query.state);
      clientOrigin = state.clientOrigin || clientOrigin;
      if (req.query.error) {
        throw new GoogleWorkspaceError(`Google từ chối kết nối: ${req.query.error}`, 'GOOGLE_OAUTH_DENIED', 400);
      }

      const tokenData = await exchangeGoogleAuthorizationCode(req.query.code);
      if (!tokenData?.access_token) {
        throw new GoogleWorkspaceError('Google không trả về access token.', 'GOOGLE_ACCESS_TOKEN_MISSING', 502);
      }
      const userInfo = await getGoogleUserInfo(tokenData.access_token);
      const email = assertAllowedGoogleAccount(userInfo);
      const drive = await getGoogleDriveAbout(tokenData.access_token);

      const connection = await GoogleWorkspaceConnection.findOne({ key: CONNECTION_KEY }).select('+refreshTokenEncrypted')
        || new GoogleWorkspaceConnection({ key: CONNECTION_KEY });

      if (tokenData.refresh_token) {
        connection.refreshTokenEncrypted = encryptGoogleSecret(tokenData.refresh_token);
      }
      if (!connection.refreshTokenEncrypted) {
        throw new GoogleWorkspaceError('Google không trả về refresh token. Hãy kết nối lại và chấp thuận quyền truy cập.', 'GOOGLE_REFRESH_TOKEN_MISSING', 400);
      }

      connection.connected = true;
      connection.googleAccountId = String(userInfo.sub || '');
      connection.email = email;
      connection.displayName = String(userInfo.name || drive?.user?.displayName || '');
      connection.picture = String(userInfo.picture || drive?.user?.photoLink || '');
      connection.scopes = String(tokenData.scope || '').split(/\s+/).filter(Boolean);
      connection.tokenType = String(tokenData.token_type || 'Bearer');
      connection.drivePermissionId = String(drive?.user?.permissionId || '');
      connection.connectedBy = state.userId;
      connection.connectedAt = new Date();
      connection.lastCheckedAt = new Date();
      connection.lastError = '';
      await connection.save();

      return res.redirect(oauthRedirect(clientOrigin, { google: 'connected' }));
    } catch (error) {
      const message = String(error?.message || 'Không thể kết nối Google Workspace.').slice(0, 220);
      return res.redirect(oauthRedirect(clientOrigin, { google: 'error', message }));
    }
  }),
);

router.use(
  requireAuth,
  requirePermission(
    PERMISSIONS.CREATE_ARTICLE,
    PERMISSIONS.EDIT_ARTICLE,
    PERMISSIONS.MANAGE_SYSTEM,
  ),
);

router.get('/status', asyncHandler(async (_req, res) => {
  const config = getGoogleWorkspaceConfigStatus();
  const connection = await GoogleWorkspaceConnection.findOne({ key: CONNECTION_KEY }).lean();
  return sendSuccess(res, {
    data: {
      ...config,
      connection: safeConnection(connection),
    },
  });
}));

router.get('/connect-url', asyncHandler(async (req, res) => {
  const state = createGoogleOAuthState(req.user._id, req.get('origin') || env.CLIENT_URL);
  return sendSuccess(res, { data: { url: createGoogleAuthorizationUrl(state) } });
}));

router.post('/setup', asyncHandler(async (req, res) => {
  const { connection, accessToken } = await loadConnectedGoogle();
  const folderYear = await ensureWorkspaceFolders(connection, accessToken, req.body?.year);
  return sendSuccess(res, {
    data: {
      folderYear,
      connection: safeConnection(connection),
    },
    message: 'Đã thiết lập cấu trúc Google Drive.',
  });
}));

router.post('/disconnect', asyncHandler(async (_req, res) => {
  const connection = await GoogleWorkspaceConnection.findOne({ key: CONNECTION_KEY }).select('+refreshTokenEncrypted');
  if (connection) {
    const refreshToken = connection.refreshTokenEncrypted ? decryptGoogleSecret(connection.refreshTokenEncrypted) : '';
    if (refreshToken) await revokeGoogleToken(refreshToken).catch(() => null);
    connection.connected = false;
    connection.refreshTokenEncrypted = '';
    connection.lastCheckedAt = new Date();
    await connection.save();
  }
  return sendSuccess(res, { data: { connected: false }, message: 'Đã ngắt kết nối Google Workspace.' });
}));

router.post('/posts/create-draft', asyncHandler(async (req, res) => {
  const seed = req.body?.seed && typeof req.body.seed === 'object' ? req.body.seed : {};
  const titleSeed = String(seed.title || '').trim();
  const generatedTitle = `Bản nháp Google Docs ${new Date().toLocaleString('vi-VN')}`;
  const created = await articleService.adminCreate(req.user._id, {
    title: titleSeed.length >= 5 ? titleSeed : generatedTitle,
    summary: String(seed.summary || '').trim(),
    bodyHtml: meaningfulHtml(seed.bodyHtml),
    articleType: seed.articleType || 'news',
    primaryCategoryId: normalizeId(seed.primaryCategoryId),
    primaryAreaId: normalizeId(seed.primaryAreaId),
    tagIds: Array.isArray(seed.tagIds) ? seed.tagIds.map(normalizeId).filter(Boolean) : [],
    thumbnailMediaId: normalizeId(seed.thumbnailMediaId),
    status: 'draft',
    sourceNote: String(seed.sourceNote || '').trim(),
  });
  const doc = await ensureArticleDocument(created._id);
  return sendCreated(res, doc, 'Đã tạo bản nháp Google Docs.');
}));

router.post('/posts/:postId/ensure-doc', asyncHandler(async (req, res) => {
  return sendSuccess(res, { data: await ensureArticleDocument(req.params.postId) });
}));

router.post('/posts/:postId/sync-from-doc', asyncHandler(async (req, res) => {
  const { content, article } = await articleBundle(req.params.postId);
  if (!article.googleDocId) {
    throw new GoogleWorkspaceError('Bài viết chưa có Google Docs.', 'GOOGLE_DOC_NOT_LINKED', 409);
  }

  const { connection, accessToken } = await loadConnectedGoogle();
  const document = await getGoogleDocsDocument(accessToken, article.googleDocId);
  const parsed = parseGoogleDocsArticle(document);

  await updateContentWithBody(
    content,
    {
      title: parsed.title,
      summary: parsed.summary,
      bodyHtml: parsed.bodyHtml,
    },
    req.user._id,
    'Đồng bộ nội dung từ Google Docs',
  );

  article.googleDocSyncedAt = new Date();
  const year = Number(article.googleDocYear || new Date().getFullYear());
  const folders = await ensureWorkspaceFolders(connection, accessToken, year);
  const docStatus = documentStatusForContent(content.status);
  const targetFolderId = folderIdForDocumentStatus(folders, docStatus);
  await moveGoogleDriveFile(accessToken, article.googleDocId, targetFolderId);
  article.googleDocFolderId = targetFolderId;
  article.googleDocStatus = docStatus;
  await article.save();

  return sendSuccess(res, {
    data: await adminArticleDetail(content._id),
    message: 'Đã đồng bộ nội dung từ Google Docs về website.',
  });
}));

export default router;
