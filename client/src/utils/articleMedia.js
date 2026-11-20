/**
 * Count the cover as rendered inline only when a real <img> with the matching
 * Media ID exists. Older URL imports wrote a cover-only <figure> without an
 * image, and that placeholder must NOT hide the visible cover.
 */
export function bodyContainsVisibleMediaId(html = '', mediaId = '') {
  const id = String(mediaId || '').trim();
  if (!/^[0-9a-f]{24}$/i.test(id)) return false;

  const imageTags = String(html || '').match(/<img\b[^>]*>/gi) || [];
  return imageTags.some((tag) => {
    const attrs = [...tag.matchAll(/\bdata-media-id\s*=\s*(?:"([^"]*)"|'([^']*)')/gi)];
    return attrs.some((match) => (match[1] || match[2] || '') === id);
  });
}
