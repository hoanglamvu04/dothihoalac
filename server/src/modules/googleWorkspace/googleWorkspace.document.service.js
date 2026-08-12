import {
  GoogleWorkspaceError,
  googleDocUrl,
} from './googleWorkspace.service.js';

const GOOGLE_DRIVE_FILES_ENDPOINT = 'https://www.googleapis.com/drive/v3/files';
const GOOGLE_DOCS_DOCUMENTS_ENDPOINT = 'https://docs.googleapis.com/v1/documents';
const GOOGLE_DOCUMENT_MIME = 'application/vnd.google-apps.document';
const DRIVE_FILE_FIELDS = [
  'id',
  'name',
  'mimeType',
  'parents',
  'driveId',
  'trashed',
  'webViewLink',
  'createdTime',
  'modifiedTime',
  'appProperties',
].join(',');

function escapeDriveQueryValue(value) {
  return String(value || '')
    .replaceAll('\\', '\\\\')
    .replaceAll("'", "\\'");
}

async function googleJsonRequest(
  url,
  accessToken,
  {
    method = 'GET',
    body,
    timeoutMs = 10000,
    fallbackMessage = 'Google API trả về lỗi.',
  } = {},
) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
      signal: controller.signal,
    });

    const contentType = response.headers.get('content-type') || '';
    const payload = contentType.includes('application/json')
      ? await response.json().catch(() => ({}))
      : await response.text().catch(() => '');

    if (response.ok) return payload;

    const detail = typeof payload === 'object'
      ? payload?.error_description || payload?.error?.message || payload?.error
      : payload;

    throw new GoogleWorkspaceError(
      String(detail || fallbackMessage).slice(0, 500),
      'GOOGLE_API_REQUEST_FAILED',
      response.status >= 400 && response.status < 500 ? 400 : 502,
    );
  } catch (error) {
    if (error instanceof GoogleWorkspaceError) throw error;

    if (error?.name === 'AbortError') {
      throw new GoogleWorkspaceError(
        `${fallbackMessage} Google phản hồi quá ${Math.ceil(timeoutMs / 1000)} giây.`,
        'GOOGLE_API_TIMEOUT',
        504,
      );
    }

    throw new GoogleWorkspaceError(
      `${fallbackMessage} ${String(error?.message || 'Lỗi kết nối Google.').slice(0, 220)}`,
      'GOOGLE_API_NETWORK_ERROR',
      502,
    );
  } finally {
    clearTimeout(timer);
  }
}

async function findManagedArticleDocument(accessToken, articleId) {
  const url = new URL(GOOGLE_DRIVE_FILES_ENDPOINT);
  const query = [
    `mimeType='${GOOGLE_DOCUMENT_MIME}'`,
    'trashed=false',
    "appProperties has { key='dthlManaged' and value='true' }",
    `appProperties has { key='dthlArticleId' and value='${escapeDriveQueryValue(articleId)}' }`,
  ];

  url.searchParams.set('q', query.join(' and '));
  url.searchParams.set('spaces', 'drive');
  url.searchParams.set('pageSize', '10');
  url.searchParams.set('fields', `files(${DRIVE_FILE_FIELDS})`);
  url.searchParams.set('orderBy', 'createdTime asc');
  url.searchParams.set('includeItemsFromAllDrives', 'true');
  url.searchParams.set('supportsAllDrives', 'true');

  const result = await googleJsonRequest(url.toString(), accessToken, {
    timeoutMs: 8000,
    fallbackMessage: 'Không tìm được Google Docs đã tạo cho bài viết.',
  });

  return Array.isArray(result?.files) ? result.files[0] || null : null;
}

async function seedGoogleDocument(accessToken, documentId, initialText) {
  const text = String(initialText || '').trim();
  if (!documentId || !text) return;

  await googleJsonRequest(
    `${GOOGLE_DOCS_DOCUMENTS_ENDPOINT}/${encodeURIComponent(documentId)}:batchUpdate`,
    accessToken,
    {
      method: 'POST',
      timeoutMs: 6000,
      body: {
        requests: [
          {
            insertText: {
              location: { index: 1 },
              text,
            },
          },
        ],
      },
      fallbackMessage: 'Không điền được nội dung ban đầu vào Google Docs.',
    },
  );
}

export async function createArticleGoogleDocFast(
  accessToken,
  {
    articleId,
    folderId,
    fileName,
    initialText,
  },
) {
  const articleKey = String(articleId || '').trim();
  if (!articleKey) {
    throw new GoogleWorkspaceError(
      'Thiếu articleId khi tạo Google Docs.',
      'GOOGLE_DOC_ARTICLE_ID_MISSING',
      400,
    );
  }

  const existing = await findManagedArticleDocument(
    accessToken,
    articleKey,
  );

  if (existing?.id) {
    return {
      ...existing,
      webViewLink: existing.webViewLink || googleDocUrl(existing.id),
    };
  }

  const url = new URL(GOOGLE_DRIVE_FILES_ENDPOINT);
  url.searchParams.set('fields', DRIVE_FILE_FIELDS);
  url.searchParams.set('supportsAllDrives', 'true');

  const file = await googleJsonRequest(url.toString(), accessToken, {
    method: 'POST',
    timeoutMs: 12000,
    body: {
      name: String(fileName || 'DTHL - Bài viết').slice(0, 180),
      mimeType: GOOGLE_DOCUMENT_MIME,
      ...(folderId ? { parents: [folderId] } : {}),
      appProperties: {
        dthlManaged: 'true',
        dthlRole: 'article',
        dthlArticleId: articleKey,
      },
    },
    fallbackMessage: 'Không tạo được Google Docs cho bài viết.',
  });

  if (!file?.id) {
    throw new GoogleWorkspaceError(
      'Google Drive đã phản hồi nhưng không có document ID.',
      'GOOGLE_DOC_ID_MISSING',
      502,
    );
  }

  const result = {
    ...file,
    webViewLink: file.webViewLink || googleDocUrl(file.id),
  };

  /*
   * Không chặn response chỉ để điền nội dung mẫu.
   * File đã tồn tại và URL đã dùng được; phần seed chạy nền có timeout riêng.
   * Đây là điểm tránh màn hình launcher bị treo dù Docs đã được tạo.
   */
  if (initialText) {
    setImmediate(() => {
      seedGoogleDocument(accessToken, file.id, initialText).catch((error) => {
        console.warn(
          `[GoogleWorkspace] Docs ${file.id} đã tạo nhưng seed nội dung thất bại: ${error.message}`,
        );
      });
    });
  }

  return result;
}
