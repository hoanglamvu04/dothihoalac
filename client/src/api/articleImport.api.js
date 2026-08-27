import { api, unwrap } from './http';

const ARTICLE_IMPORT_TIMEOUT_MS = 90000;

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
