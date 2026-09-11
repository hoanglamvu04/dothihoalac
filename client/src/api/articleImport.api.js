import { api, unwrap } from './http';

const ARTICLE_IMPORT_TIMEOUT_MS = 90000;
const ARTICLE_URL_PREVIEW_TIMEOUT_MS = 30000;
const ARTICLE_URL_IMPORT_TIMEOUT_MS = 120000;

export async function importArticleDocument(file) {
  const formData = new FormData();
  formData.append('file', file);

  return unwrap(
    await api.post(
      '/admin/articles/import-document',
      formData,
      { timeout: ARTICLE_IMPORT_TIMEOUT_MS },
    ),
  );
}

export async function previewArticleUrl(url) {
  return unwrap(
    await api.post(
      '/admin/articles/import-url/preview',
      { url },
      { timeout: ARTICLE_URL_PREVIEW_TIMEOUT_MS },
    ),
  );
}

export async function importArticleUrl({
  url,
  includeImages = true,
  force = false,
}) {
  return unwrap(
    await api.post(
      '/admin/articles/import-url',
      {
        url,
        includeImages,
        force,
      },
      { timeout: ARTICLE_URL_IMPORT_TIMEOUT_MS },
    ),
  );
}
