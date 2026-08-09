import { Router } from 'express';

import { PERMISSIONS } from '../../constants/permissions.js';
import { requireAuth } from '../../middlewares/auth.middleware.js';
import { requirePermission } from '../../middlewares/role.middleware.js';
import asyncHandler from '../../utils/asyncHandler.js';
import { sendCreated, sendSuccess } from '../../utils/apiResponse.js';
import * as articleService from '../articles/article.service.js';
import Article from '../articles/article.model.js';
import Content from '../contents/content.model.js';
import ContentBody from '../contents/contentBody.model.js';
import { GoogleDocumentCounter } from './googleWorkspace.model.js';
import { createArticleGoogleDocFast } from './googleWorkspace.document.service.js';
import {
  GoogleWorkspaceError,
  documentStatusForContent,
  ensureWorkspaceFolders,
  folderIdForDocumentStatus,
  getGoogleDriveFile,
  googleDocUrl,
  loadConnectedGoogle,
  moveGoogleDriveFile,
} from './googleWorkspace.service.js';

const router = Router();
const FOLDER_KEYS = [
  'yearFolderId',
  'templateFolderId',
  'draftFolderId',
  'reviewFolderId',
  'publishedFolderId',
  'archiveFolderId',
];
const articleGuard = [
  requireAuth,
  requirePermission(
    PERMISSIONS.CREATE_ARTICLE,
    PERMISSIONS.EDIT_ARTICLE,
    PERMISSIONS.MANAGE_SYSTEM,
  ),
];

function withTimeout(promise, timeoutMs, message) {
  let timer;

  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => {
      reject(
        new GoogleWorkspaceError(
          message,
          'GOOGLE_OPERATION_TIMEOUT',
          504,
        ),
      );
    }, timeoutMs);
  });

  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
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

function normalizedDraftToken(value) {
  return String(value || '').trim().slice(0, 180);
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
    throw new GoogleWorkspaceError(
      'Không tìm thấy bài viết để liên kết Google Docs.',
      'ARTICLE_NOT_FOUND',
      404,
    );
  }

  return { content, body, article };
}

function cachedFolderYear(connection, year) {
  const item = (connection?.folderYears || []).find(
    (entry) => Number(entry?.year) === Number(year),
  );

  if (!item || !connection?.rootFolderId) return null;

  const data = typeof item.toObject === 'function' ? item.toObject() : item;
  if (FOLDER_KEYS.some((key) => !String(data?.[key] || '').trim())) return null;

  return { ...data, year: Number(data.year) };
}

async function resolveFolderYear(connection, accessToken, year) {
  const cached = cachedFolderYear(connection, year);
  if (cached) return cached;

  return withTimeout(
    ensureWorkspaceFolders(connection, accessToken, year),
    30000,
    'Google Drive phản hồi quá chậm khi thiết lập cây thư mục DTHL. Hãy vào Google Workspace, bấm “Thiết lập thư mục năm nay” rồi thử lại.',
  );
}

async function ensureArticleDocument(contentId) {
  const { content, body, article } = await articleBundle(contentId);
  const { connection, accessToken } = await withTimeout(
    loadConnectedGoogle(),
    12000,
    'Google phản hồi quá chậm khi làm mới phiên Workspace. Hãy thử lại.',
  );
  const year = Number(article.googleDocYear || new Date().getFullYear());
  const folders = await resolveFolderYear(connection, accessToken, year);
  const docStatus = documentStatusForContent(content.status);
  const targetFolderId = folderIdForDocumentStatus(folders, docStatus);

  let file = null;

  if (article.googleDocId) {
    file = await withTimeout(
      getGoogleDriveFile(accessToken, article.googleDocId),
      10000,
      'Google Drive phản hồi quá chậm khi mở tài liệu hiện có.',
    );
  }

  const documentCode = article.documentCode || await nextDocumentCode();
  const fileName = `${documentCode} - ${String(content.title || 'Bài viết').trim()}`.slice(0, 180);

  if (!file) {
    const initialText = [
      content.title,
      content.summary,
      body?.bodyText || content.bodyText || 'Bắt đầu viết nội dung bài tại đây.',
    ].filter(Boolean).join('\n\n');

    file = await withTimeout(
      createArticleGoogleDocFast(accessToken, {
        articleId: content._id,
        folderId: targetFolderId,
        fileName,
        initialText,
      }),
      20000,
      'Google Docs phản hồi quá chậm khi tạo tài liệu. Hãy thử lại; hệ thống sẽ tìm lại tài liệu đã tạo thay vì tạo trùng.',
    );
  } else if (targetFolderId) {
    file = (
      await withTimeout(
        moveGoogleDriveFile(accessToken, file.id, targetFolderId),
        12000,
        'Google Drive phản hồi quá chậm khi chuyển tài liệu vào thư mục nội dung.',
      )
    ) || file;
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

router.post(
  '/posts/create-draft',
  ...articleGuard,
  asyncHandler(async (req, res) => {
    const draftToken = normalizedDraftToken(req.body?.draftToken);

    if (draftToken) {
      const previous = await Article.findOne({ googleDraftToken: draftToken }).lean();
      if (previous?.contentId) {
        return sendCreated(
          res,
          await ensureArticleDocument(previous.contentId),
          'Đã mở lại bản nháp Google Docs đang tạo dở.',
        );
      }
    }

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
      tagIds: Array.isArray(seed.tagIds)
        ? seed.tagIds.map(normalizeId).filter(Boolean)
        : [],
      thumbnailMediaId: normalizeId(seed.thumbnailMediaId),
      status: 'draft',
      sourceNote: String(seed.sourceNote || '').trim(),
    });

    if (draftToken) {
      await Article.updateOne(
        { contentId: created._id },
        { $set: { googleDraftToken: draftToken } },
      );
    }

    return sendCreated(
      res,
      await ensureArticleDocument(created._id),
      'Đã tạo bản nháp Google Docs.',
    );
  }),
);

router.post(
  '/posts/:postId/ensure-doc',
  ...articleGuard,
  asyncHandler(async (req, res) => {
    return sendSuccess(res, {
      data: await ensureArticleDocument(req.params.postId),
    });
  }),
);

export default router;
