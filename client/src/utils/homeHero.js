export const HOME_HERO_AUTOPLAY_MS = 6000;

export function heroStoryId(item) {
  return String(item?._id || item?.id || item?.slug || '');
}

export function hasHeroImage(item) {
  const media = item?.thumbnailMediaId;
  const url = typeof media === 'string'
    ? media
    : media?.secureUrl || media?.url || media?.publicUrl || media?.storagePath || '';

  return Boolean(
    url &&
    !/^[a-f0-9]{24}$/i.test(String(url).trim()),
  );
}

/**
 * The homepage feed reserves articles 0..7 for latest news and 8..11 for
 * urban-development highlights. Try the lead story and articles 4..7 first
 * so the rotating lead doesn't duplicate the three fixed side stories
 * unnecessarily. Fall back to photo-ready side stories when needed.
 *
 * Never attach an unrelated picture to a different article. If every
 * candidate lacks a usable image, keep the latest story with a branded,
 * explicit no-image placeholder rather than a deceptive stock photo.
 */
export function selectHomeHeroStories(articles = [], failedIds = [], maxSlides = 4) {
  const primary = Array.isArray(articles) ? articles.slice(0, 8) : [];
  if (!primary.length) return [];

  const preferred = [
    primary[0],
    ...primary.slice(4),
    ...primary.slice(1, 4),
  ];
  const failed = new Set(failedIds);
  const seen = new Set();

  const usable = preferred.filter((item) => {
    const id = heroStoryId(item);
    if (!id || seen.has(id)) return false;
    seen.add(id);
    return hasHeroImage(item) && !failed.has(id);
  });

  return usable.length
    ? usable.slice(0, Math.max(1, maxSlides))
    : [primary[0]];
}
