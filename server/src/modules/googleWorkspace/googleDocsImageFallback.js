/**
 * The URL importer stores the original article photographs in Media Library,
 * ordered exactly like the images inserted into Google Docs.
 *
 * Reusing these originals is safe only for the very first Docs -> CMS sync:
 * after editing/reordering the Google Doc, ordinal matching can be stale.
 * For later syncs, reuse the stable Google Docs object-ID map instead.
 */
export function sourceMediaIdForInitialSync(article, ordinal) {
  if (
    !article ||
    !Number.isInteger(ordinal) ||
    ordinal < 0 ||
    article.googleDocSyncedAt ||
    !(article.sourceCanonicalUrl || article.sourceUrl)
  ) {
    return '';
  }

  const ids = article.urlImportImageMediaIds;
  if (!Array.isArray(ids)) return '';

  const value = String(ids[ordinal] || '').trim();
  return /^[a-f0-9]{24}$/i.test(value) ? value : '';
}
