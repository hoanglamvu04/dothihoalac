import path from 'node:path';

import Article from './article.model.js';
import * as articleService from './article.service.js';
import { adminDeleteArticle } from './article.admin.delete.service.js';
import {
  GoogleWorkspaceError,
  documentStatusForContent,
  ensureWorkspaceFolders,
  folderIdForDocumentStatus,
  googleDocUrl,
  loadConnectedGoogle,
} from '../googleWorkspace/googleWorkspace.service.js';

const GOOGLE_DRIVE_UPLOAD_ENDPOINT =
  'https://www.googleapis.com/upload/drive/v3/files';
const GOOGLE_DOCUMENT_MIME =
  'application/vnd.google-apps.document';

function cleanFileBaseName(filename = '') {
  return String(path.parse(filename || 'tai-lieu').name || 'tai-lieu')
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 180);
}

function titleFromFilename(filename = '') {
  const title = cleanFileBaseName(filename);
  return title.length >= 5
    ? title.slice(0, 250)
    : `Bài nhập từ tài liệu ${new Date().toLocaleString('vi-VN')}`;
}

async function uploadConvertedGoogleDoc(
  accessToken,
  {
    articleId,
    folderId,
    file,
  },
) {
  const boundary =
    `dthl_import_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const sourceName = cleanFileBaseName(file.originalname);
  const metadata = {
    name: sourceName,
    mimeType: GOOGLE_DOCUMENT_MIME,
    ...(folderId ? { parents: [folderId] } : {}),
    appProperties: {
      dthlManaged: 'true',
      dthlRole: 'article',
      dthlArticleId: String(articleId),
      dthlImportSource: 'admin-upload',
    },
  };

  const prefix = Buffer.from(
    `--${boundary}\r\n` +
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      `${JSON.stringify(metadata)}\r\n` +
      `--${boundary}\r\n` +
      `Content-Type: ${file.mimetype || 'application/octet-stream'}\r\n\r\n`,
  );
  const suffix = Buffer.from(`\r\n--${boundary}--`);
  const body = Buffer.concat([
    prefix,
    file.buffer,
    suffix,
  ]);

  const url = new URL(GOOGLE_DRIVE_UPLOAD_ENDPOINT);
  url.searchParams.set('uploadType', 'multipart');
  url.searchParams.set(
    'fields',
    'id,name,mimeType,parents,webViewLink,createdTime,modifiedTime',
  );
  url.searchParams.set('supportsAllDrives', 'true');

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 45000);

  try {
    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body,
      signal: controller.signal,
    });

    const payload = await response.json().catch(() => ({}));

    if (!response.ok || !payload?.id) {
      throw new GoogleWorkspaceError(
        String(
          payload?.error?.message ||
            `Google Drive không nhập được tài liệu (HTTP ${response.status}).`,
        ).slice(0, 500),
        'GOOGLE_DOCUMENT_IMPORT_FAILED',
        response.status >= 400 && response.status < 500 ? 400 : 502,
      );
    }

    return payload;
  } catch (error) {
    if (error instanceof GoogleWorkspaceError) throw error;

    if (error?.name === 'AbortError') {
      throw new GoogleWorkspaceError(
        'Google Drive phản hồi quá chậm khi chuyển tài liệu sang Google Docs.',
        'GOOGLE_DOCUMENT_IMPORT_TIMEOUT',
        504,
      );
    }

    throw new GoogleWorkspaceError(
      `Không thể nhập tài liệu vào Google Drive: ${String(error?.message || 'Lỗi kết nối Google.').slice(0, 220)}`,
      'GOOGLE_DOCUMENT_IMPORT_NETWORK_ERROR',
      502,
    );
  } finally {
    clearTimeout(timer);
  }
}

export async function importAdminArticleDocument(userId, file) {
  if (!file?.buffer || !file?.originalname) {
    throw new GoogleWorkspaceError(
      'Chưa chọn file Word hoặc PDF để nhập.',
      'ARTICLE_IMPORT_FILE_REQUIRED',
      422,
    );
  }

  const { connection, accessToken } = await loadConnectedGoogle();
  const year = new Date().getFullYear();
  const folders = await ensureWorkspaceFolders(
    connection,
    accessToken,
    year,
  );
  const docStatus = documentStatusForContent('draft');
  const targetFolderId = folderIdForDocumentStatus(
    folders,
    docStatus,
  );

  const created = await articleService.adminCreate(userId, {
    title: titleFromFilename(file.originalname),
    summary: '',
    bodyHtml:
      '<p>Nội dung đang được nhập từ tài liệu Word/PDF. Hãy đồng bộ Google Docs để hoàn tất.</p>',
    articleType: 'news',
    status: 'draft',
    sourceNote: `Nhập từ tệp: ${String(file.originalname).slice(0, 300)}`,
  });

  try {
    const driveFile = await uploadConvertedGoogleDoc(
      accessToken,
      {
        articleId: created._id,
        folderId: targetFolderId,
        file,
      },
    );

    const article = await Article.findOne({
      contentId: created._id,
    });

    if (!article) {
      throw new GoogleWorkspaceError(
        'Đã tạo bài nhưng không tìm thấy metadata Article để liên kết Google Docs.',
        'ARTICLE_IMPORT_METADATA_MISSING',
        500,
      );
    }

    article.googleDocId = driveFile.id;
    article.googleDocUrl =
      driveFile.webViewLink || googleDocUrl(driveFile.id);
    article.googleDocFileName =
      driveFile.name || cleanFileBaseName(file.originalname);
    article.googleDocFolderId = targetFolderId || '';
    article.googleDocStatus = docStatus;
    article.googleDocYear = year;
    article.googleDocSyncedAt = null;

    await article.save();

    return {
      postId: String(created._id),
      docId: driveFile.id,
      docUrl: article.googleDocUrl,
      fileName: article.googleDocFileName,
      sourceFileName: file.originalname,
      status: 'draft',
      year,
    };
  } catch (error) {
    await adminDeleteArticle(created._id).catch(() => null);
    throw error;
  }
}
