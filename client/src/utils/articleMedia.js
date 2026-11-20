/**
 * A cover is truly inline only if a visible image with the corresponding
 * Media ID exists. Legacy imports wrote a figure with data-media-id but no
 * <img>, then the renderer removed it. That empty placeholder must not
 * suppress the standalone cover.
 */
function hasMediaId(tag, id) {
  return [...String(tag || '').matchAll(/\bdata-media-id\s*=\s*(?:"([^"]*)"|'([^']*)')/gi)]
    .some((match) => (match[1] || match[2] || '') === id);
}

export function bodyContainsVisibleMediaId(html = '', mediaId = '') {
  const id = String(mediaId || '').trim();
  if (!/^[0-9a-f]{24}$/i.test(id)) return false;

  const source = String(html || '');
  const imageTags = source.match(/<img\b[^>]*>/gi) || [];

  if (imageTags.some((tag) => hasMediaId(tag, id))) return true;

  // A valid legacy figure may put its Media ID on <figure> only.
  const figures = source.match(/<figure\b[^>]*>[\s\S]*?<\/figure>/gi) || [];
  return figures.some((figure) => {
    if (!/<img\b[^>]*>/i.test(figure)) return false;
    const openingTag = figure.match(/^<figure\b[^>]*>/i)?.[0] || '';
    return hasMediaId(openingTag, id);
  });
}
