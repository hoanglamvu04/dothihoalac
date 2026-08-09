import { Router } from 'express';
import mongoose from 'mongoose';
import { env } from '../../config/env.js';
import { requireAuth } from '../../middlewares/auth.middleware.js';
import { requirePermission } from '../../middlewares/role.middleware.js';
import { PERMISSIONS } from '../../constants/permissions.js';
import asyncHandler from '../../utils/asyncHandler.js';
import { sendSuccess } from '../../utils/apiResponse.js';
import Content from '../contents/content.model.js';
import ContentBody from '../contents/contentBody.model.js';
import { updateContentWithBody } from '../contents/content.service.js';
import Media from '../media/media.model.js';
import { uploadImage } from '../media/media.service.js';
import User from '../users/user.model.js';
import Article from '../articles/article.model.js';
import { getAdminArticleDetail } from '../articles/article.admin-detail.js';
import {
  GoogleDocumentCounter,
  GoogleWorkspaceConnection,
} from './googleWorkspace.model.js';
import {
  GOOGLE_WORKSPACE_SCOPES,
  GoogleWorkspaceError,
  assertAllowedGoogleAccount,
  assertGoogleWorkspaceConfigured,
  createGoogleAuthorizationUrl,
  createGoogleDriveDocument,
  createGoogleOAuthState,
  decryptGoogleSecret,
  downloadGoogleImage,
  encryptGoogleSecret,
  ensureGoogleDriveFolder,
  exchangeGoogleAuthorizationCode,
  findGoogleDriveDocumentByContent,
  getGoogleDocsDocument,
  getGoogleDriveAbout,
  getGoogleDriveFile,
  getGoogleInlineImage,
  getGoogleUserInfo,
  getGoogleWorkspaceConfigStatus,
  googleDocUrl,
  parseGoogleDocsArticle,
  populateGoogleDocsDocument,
  refreshGoogleAccessToken,
  revokeGoogleToken,
  verifyGoogleOAuthState,
} from './googleWorkspace.service.js';

const router = Router();
const CONNECTION_KEY = 'primary';
const ROOT_FOLDER_NAME = 'DTHL - NỘI DUNG WEBSITE';

const FOLDER_DEFINITIONS = [
  { key: 'templateFolderId', name: '00_MẪU_TÀI_LIỆU', role: 'templates' },
  { key: 'draftFolderId', name: '01_ĐANG_SOẠN', role: 'drafts' },
  { key: 'reviewFolderId', name: '02_CHỜ_DUYỆT', role: 'review' },
  { key: 'publishedFolderId', name: '03_ĐÃ_XUẤT_BẢN', role: 'published' },
  { key: 'archiveFolderId', name: '99_LƯU_TRỮ', role: 'archive' },
];

const editorGuard = [
  requireAuth,
  requirePermission(
    PERMISSIONS.CREATE_ARTICLE,
    PERMISSIONS.EDIT_ARTICLE,
    PERMISSIONS.MANAGE_SYSTEM,
  ),
];

const systemGuard = [
  requireAuth,
  requirePermission(PERMISSIONS.MANAGE_SYSTEM),
];

const driveFolderUrl = (folderId) => (
  folderId ? `https://drive.google.com/drive/folders/${encodeURIComponent(folderId)}` : ''
);

function safeConnection(connection) {
  if (!connection) return null;
  return {
    id: String(connection._id || ''),
    connected: Boolean(connection.connected),
    email: connection.email || '',
    displayName: connection.displayName || '',
    picture: connection.picture || '',
    googleAccountId: connection.googleAccountId || '',
    scopes: connection.scopes || [],
    drivePermissionId: connection.drivePermissionId || '',
    connectedAt: connection.connectedAt || null,
    lastCheckedAt: connection.lastCheckedAt || null,
    lastError: connection.lastError || '',
    rootFolderId: connection.rootFolderId || '',
    rootFolderName: connection.rootFolderName || '',
    rootFolderUrl: driveFolderUrl(connection.rootFolderId),
    folderYears: (connection.folderYears || [])
      .map((item) => ({
        year: Number(item.year),
        yearFolderId: item.yearFolderId || '',
        templateFolderId: item.templateFolderId || '',
        draftFolderId: item.draftFolderId || '',
        reviewFolderId: item.reviewFolderId || '',
        publishedFolderId: item.publishedFolderId || '',
        archiveFolderId: item.archiveFolderId || '',
        setupAt: item.setupAt || null,
      }))
      .sort((a, b) => b.year - a.year),
  };
}

function normalizeYear(value) {
  const currentYear = new Date().getFullYear();
  const numeric = Number(value || currentYear);
  if (!Number.isInteger(numeric) || numeric < 2020 || numeric > currentYear + 5) {
    throw new GoogleWorkspaceError(
      `Năm thư mục không hợp lệ. Chỉ chấp nhận từ 2020 đến ${currentYear + 5}.`,
      'GOOGLE_FOLDER_YEAR_INVALID',
      400,
    );
  }
  return numeric;
}

async function loadConnectedGoogle() {
  assertGoogleWorkspaceConfigured();
  const connection = await GoogleWorkspaceConnection.findOne({
    key: CONNECTION_KEY,
    connected: true,
  }).select('+refreshTokenEncrypted');
  if (!connection?.refreshTokenEncrypted) {
    throw new GoogleWorkspaceError(
      'Google Workspace chưa được kết nối.',
      'GOOGLE_WORKSPACE_NOT_CONNECTED',
      409,
    );
  }
  const refreshToken = decryptGoogleSecret(connection.refreshTokenEncrypted);
  const tokenData = await refreshGoogleAccessToken(refreshToken);
  return { connection, refreshToken, accessToken: tokenData.access_token };
}

async function ensureFoldersForYear(connection, accessToken, yearValue) {
  const year = normalizeYear(yearValue);
  let root = connection.rootFolderId
    ? await getGoogleDriveFile(accessToken, connection.rootFolderId)
    : null;
  if (!root) {
    root = await ensureGoogleDriveFolder(accessToken, {
      name: ROOT_FOLDER_NAME,
      role: 'root',
    });
    connection.rootFolderId = root.id;
    connection.rootFolderName = root.name || ROOT_FOLDER_NAME;
  }

  const yearFolder = await ensureGoogleDriveFolder(accessToken, {
    name: String(year),
    parentId: root.id,
    role: 'year',
    year,
  });

  const folderData = {
    year,
    yearFolderId: yearFolder.id,
    setupAt: new Date(),
  };

  for (const definition of FOLDER_DEFINITIONS) {
    const folder = await ensureGoogleDriveFolder(accessToken, {
      name: definition.name,
      parentId: yearFolder.id,
      role: definition.role,
      year,
    });
    folderData[definition.key] = folder.id;
  }

  const existing = connection.folderYears.find((item) => Number(item.year) === year);
  if (existing) Object.assign(existing, folderData);
  else connection.folderYears.push(folderData);
  connection.lastCheckedAt = new Date();
  connection.lastError = '';
  await connection.save();

  return {
    year,
    rootFolderId: root.id,
    rootFolderName: root.name || ROOT_FOLDER_NAME,
    ...folderData,
  };
}

function folderForStatus(folderYear, status) {
  if (status === 'published') return folderYear.publishedFolderId;
  if (['pending_review', 'approved', 'scheduled'].includes(status)) return folderYear.reviewFolderId;
  return folderYear.draftFolderId;
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

function escapeHtml(value = '') {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function mimeExtension(mimetype = '') {
  if (mimetype.includes('png')) return 'png';
  if (mimetype.includes('webp')) return 'webp';
  if (mimetype.includes('gif')) return 'gif';
  return 'jpg';
}

async function resolveGoogleDocImage({
  document,
  objectId,
  accessToken,
  user,
  contentId,
  existingMap,
  usedMediaIds,
}) {
  const cached = existingMap?.[objectId];
  if (cached?.mediaId && !usedMediaIds.has(String(cached.mediaId))) {
    const media = await Media.findOne({
      _id: cached.mediaId,
      status: 'active',
      deletedAt: null,
    }).lean();
    if (media) {
      usedMediaIds.add(String(media._id));
      return {
        media,
        mapValue: cached,
      };
    }
  }

  const image = getGoogleInlineImage(document, objectId);
  if (!image.contentUri) return null;
  const downloaded = await downloadGoogleImage(accessToken, image.contentUri);
  const alt = String(image.description || image.title || 'Ảnh minh họa từ Google Docs')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 300) || 'Ảnh minh họa từ Google Docs';
  const file = {
    buffer: downloaded.buffer,
    originalname: `google-doc-${objectId}.${mimeExtension(downloaded.contentType)}`,
    mimetype: downloaded.contentType,
    size: downloaded.buffer.length,
  };
  const media = await uploadImage(user, file, {
    altText: alt,
    folder: `articles/google-docs/${contentId}`,
  });
  usedMediaIds.add(String(media._id));
  return {
    media: media.toObject ? media.toObject() : media,
    mapValue: {
      mediaId: String(media._id),
      url: media.secureUrl || media.url,
      syncedAt: new Date().toISOString(),
    },
  };
}

async function blocksToHtml({ document, blocks, accessToken, user, contentId, existingMap = {} }) {
  const html = [];
  const nextImageMap = { ...existingMap };
  const usedMediaIds = new Set();
  let imageCount = 0;

  for (const block of blocks) {
    if (block.type === 'image') {
      const resolved = await resolveGoogleDocImage({
        document,
        objectId: block.objectId,
        accessToken,
        user,
        contentId,
        existingMap,
        usedMediaIds,
      });
      if (!resolved) continue;
      const media = resolved.media;
      const mediaId = String(media._id);
      const url = media.secureUrl || media.url;
      const alt = String(media.altText || 'Ảnh minh họa từ Google Docs').trim() || 'Ảnh minh họa từ Google Docs';
      const caption = `Ảnh đồng bộ từ Google Docs · Đô Thị Hòa Lạc`;
      nextImageMap[block.objectId] = resolved.mapValue;
      imageCount += 1;
      html.push(
        `<figure data-media-id="${escapeHtml(mediaId)}"><img data-media-id="${escapeHtml(mediaId)}" src="${escapeHtml(url)}" alt="${escapeHtml(alt)}" loading="lazy" decoding="async"><figcaption>${escapeHtml(caption)}</figcaption></figure>`,
      );
      continue;
    }
    if (block.type === 'ul' || block.type === 'ol') {
      html.push(`<${block.type}>${(block.items || []).map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</${block.type}>`);
      continue;
    }
    if (block.type === 'h2') html.push(`<h2>${escapeHtml(block.text)}</h2>`);
    else if (block.type === 'h3') html.push(`<h3>${escapeHtml(block.text)}</h3>`);
    else if (block.text) html.push(`<p>${escapeHtml(block.text)}</p>`);
  }

  return {
    bodyHtml: html.join('\n'),
    imageMap: nextImageMap,
    imageCount,
  };
}

router.get(
  '/status',
  ...editorGuard,
  asyncHandler(async (_req, res) => {
    const config = getGoogleWorkspaceConfigStatus();
    const connection = await GoogleWorkspaceConnection.findOne({ key: CONNECTION_KEY }).lean();
    return sendSuccess(res, {
      data: {
        ...config,
        connected: Boolean(connection?.connected),
        connection: safeConnection(connection),
      },
    });
  }),
);

router.post(
  '/connect',
  ...systemGuard,
  asyncHandler(async (req, res) => {
    assertGoogleWorkspaceConfigured();
    const state = createGoogleOAuthState(req.user._id);
    return sendSuccess(res, {
      data: { authorizationUrl: createGoogleAuthorizationUrl(state) },
    });
  }),
);

router.get('/callback', async (req, res) => {
  const clientTarget = new URL('/quan-tri/google-workspace', env.CLIENT_URL);
  try {
    if (req.query.error) {
      throw new GoogleWorkspaceError(
        `Google OAuth bị hủy hoặc từ chối: ${String(req.query.error).slice(0, 120)}`,
        'GOOGLE_OAUTH_DENIED',
        400,
      );
    }
    const state = verifyGoogleOAuthState(req.query.state);
    const actor = await User.findById(state.userId).lean();
    if (!actor) throw new GoogleWorkspaceError('Tài khoản quản trị không còn tồn tại.', 'GOOGLE_OAUTH_USER_NOT_FOUND', 404);

    const tokenData = await exchangeGoogleAuthorizationCode(req.query.code);
    const userInfo = await getGoogleUserInfo(tokenData.access_token);
    const email = await assertAllowedGoogleAccount(userInfo);
    const about = await getGoogleDriveAbout(tokenData.access_token);
    const existing = await GoogleWorkspaceConnection.findOne({ key: CONNECTION_KEY }).select('+refreshTokenEncrypted');
    const refreshTokenEncrypted = tokenData.refresh_token
      ? encryptGoogleSecret(tokenData.refresh_token)
      : existing?.refreshTokenEncrypted || '';
    if (!refreshTokenEncrypted) {
      throw new GoogleWorkspaceError(
        'Google chưa cấp refresh token. Hãy kết nối lại và chấp nhận quyền truy cập.',
        'GOOGLE_REFRESH_TOKEN_MISSING',
        400,
      );
    }

    await GoogleWorkspaceConnection.findOneAndUpdate(
      { key: CONNECTION_KEY },
      {
        $set: {
          connected: true,
          googleAccountId: userInfo.sub || '',
          email,
          displayName: userInfo.name || about?.user?.displayName || '',
          picture: userInfo.picture || about?.user?.photoLink || '',
          refreshTokenEncrypted,
          scopes: String(tokenData.scope || '').split(/\s+/).filter(Boolean).length
            ? String(tokenData.scope).split(/\s+/).filter(Boolean)
            : GOOGLE_WORKSPACE_SCOPES,
          tokenType: tokenData.token_type || 'Bearer',
          drivePermissionId: about?.user?.permissionId || '',
          connectedBy: actor._id,
          connectedAt: new Date(),
          lastCheckedAt: new Date(),
          lastError: '',
        },
        $setOnInsert: { key: CONNECTION_KEY },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    clientTarget.searchParams.set('google', 'connected');
    return res.redirect(clientTarget.toString());
  } catch (error) {
    clientTarget.searchParams.set('google', 'error');
    clientTarget.searchParams.set('message', String(error?.message || 'Không thể kết nối Google Workspace.').slice(0, 240));
    return res.redirect(clientTarget.toString());
  }
});

router.post(
  '/disconnect',
  ...systemGuard,
  asyncHandler(async (_req, res) => {
    const connection = await GoogleWorkspaceConnection.findOne({ key: CONNECTION_KEY }).select('+refreshTokenEncrypted');
    if (connection?.refreshTokenEncrypted) {
      const refreshToken = decryptGoogleSecret(connection.refreshTokenEncrypted);
      await revokeGoogleToken(refreshToken).catch(() => null);
    }
    if (connection) {
      connection.connected = false;
      connection.refreshTokenEncrypted = '';
      connection.lastCheckedAt = new Date();
      await connection.save();
    }
    return sendSuccess(res, { data: { connected: false } });
  }),
);

router.post(
  '/setup',
  ...systemGuard,
  asyncHandler(async (req, res) => {
    const { connection, accessToken } = await loadConnectedGoogle();
    const folders = await ensureFoldersForYear(connection, accessToken, req.body?.year);
    return sendSuccess(res, { data: { folders, connection: safeConnection(connection) } });
  }),
);

router.get(
  '/folders',
  ...editorGuard,
  asyncHandler(async (req, res) => {
    const year = normalizeYear(req.query.year);
    const connection = await GoogleWorkspaceConnection.findOne({ key: CONNECTION_KEY }).lean();
    const folderYear = connection?.folderYears?.find((item) => Number(item.year) === year) || null;
    return sendSuccess(res, {
      data: {
        year,
        folders: folderYear || {},
        rootFolderId: connection?.rootFolderId || '',
      },
    });
  }),
);

router.post(
  '/articles/:id/ensure-doc',
  ...editorGuard,
  asyncHandler(async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) {
      throw new GoogleWorkspaceError('ID bài viết không hợp lệ.', 'INVALID_ARTICLE_ID', 400);
    }
    const [content, body, article] = await Promise.all([
      Content.findOne({ _id: req.params.id, contentType: 'article', deletedAt: null }),
      ContentBody.findOne({ contentId: req.params.id }).lean(),
      Article.findOne({ contentId: req.params.id }),
    ]);
    if (!content) throw new GoogleWorkspaceError('Không tìm thấy bài viết.', 'ARTICLE_NOT_FOUND', 404);

    const { connection, accessToken } = await loadConnectedGoogle();
    const year = Number(article?.googleDocYear || new Date().getFullYear());
    const folderYear = await ensureFoldersForYear(connection, accessToken, year);

    let driveDoc = article?.googleDocId
      ? await getGoogleDriveFile(accessToken, article.googleDocId)
      : null;
    if (!driveDoc) driveDoc = await findGoogleDriveDocumentByContent(accessToken, String(content._id));

    let created = false;
    let documentCode = article?.documentCode || '';
    if (!driveDoc) {
      if (!documentCode) documentCode = await nextDocumentCode();
      const fileName = `[${documentCode}] ${String(content.title).replace(/\s+/g, ' ').trim().slice(0, 150)}`;
      driveDoc = await createGoogleDriveDocument(accessToken, {
        name: fileName,
        parentId: folderForStatus(folderYear, content.status),
        contentId: content._id,
        documentCode,
        year,
      });
      await populateGoogleDocsDocument(accessToken, driveDoc.id, {
        title: content.title,
        summary: content.summary,
        bodyText: body?.bodyText || '',
      });
      created = true;
    }

    const docUrl = googleDocUrl(driveDoc.id) || driveDoc.webViewLink || '';
    const savedArticle = await Article.findOneAndUpdate(
      { contentId: content._id },
      {
        $set: {
          contentSource: 'google-docs',
          documentCode: documentCode || article?.documentCode || '',
          googleDocId: driveDoc.id,
          googleDocUrl: docUrl,
          googleDocFileName: driveDoc.name || '',
          googleDocFolderId: driveDoc.parents?.[0] || folderForStatus(folderYear, content.status),
          googleDocYear: year,
          googleDocStatus: content.status,
          googleDocLastOpenedAt: new Date(),
          googleDocError: '',
          editorId: req.user._id,
        },
        $setOnInsert: {
          contentId: content._id,
          articleType: 'news',
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    return sendSuccess(res, {
      data: {
        created,
        docId: driveDoc.id,
        docUrl,
        documentCode: savedArticle.documentCode,
        fileName: driveDoc.name || '',
        folderId: savedArticle.googleDocFolderId,
        year,
      },
    });
  }),
);

router.post(
  '/articles/:id/sync',
  ...editorGuard,
  asyncHandler(async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) {
      throw new GoogleWorkspaceError('ID bài viết không hợp lệ.', 'INVALID_ARTICLE_ID', 400);
    }
    const [content, article] = await Promise.all([
      Content.findOne({ _id: req.params.id, contentType: 'article', deletedAt: null }),
      Article.findOne({ contentId: req.params.id }),
    ]);
    if (!content) throw new GoogleWorkspaceError('Không tìm thấy bài viết.', 'ARTICLE_NOT_FOUND', 404);
    if (!article?.googleDocId) {
      throw new GoogleWorkspaceError('Bài viết chưa được liên kết với Google Docs.', 'GOOGLE_DOC_NOT_LINKED', 409);
    }

    const { accessToken } = await loadConnectedGoogle();
    try {
      const document = await getGoogleDocsDocument(accessToken, article.googleDocId);
      const parsed = parseGoogleDocsArticle(document);
      const rendered = await blocksToHtml({
        document,
        blocks: parsed.blocks,
        accessToken,
        user: req.user,
        contentId: content._id,
        existingMap: article.googleDocImageMap || {},
      });
      if (!rendered.bodyHtml.trim()) {
        throw new GoogleWorkspaceError('Google Docs chưa có nội dung có thể đồng bộ.', 'GOOGLE_DOC_CONTENT_EMPTY', 400);
      }

      await updateContentWithBody(
        content,
        {
          title: parsed.title,
          summary: parsed.summary || content.summary,
          bodyHtml: rendered.bodyHtml,
        },
        req.user._id,
        'Đồng bộ nội dung từ Google Docs',
      );

      article.contentSource = 'google-docs';
      article.googleDocLastSyncedAt = new Date();
      article.googleDocStatus = content.status;
      article.googleDocError = '';
      article.googleDocImageMap = rendered.imageMap;
      article.googleDocImageCount = rendered.imageCount;
      article.editorId = req.user._id;
      await article.save();

      return sendSuccess(res, {
        data: await getAdminArticleDetail(content._id),
        message: `Đã đồng bộ Google Docs${rendered.imageCount ? ` và ${rendered.imageCount} ảnh` : ''}.`,
      });
    } catch (error) {
      await Article.updateOne(
        { contentId: content._id },
        { $set: { googleDocError: String(error?.message || 'Đồng bộ Google Docs thất bại.').slice(0, 500) } },
      ).catch(() => null);
      throw error;
    }
  }),
);

export default router;
