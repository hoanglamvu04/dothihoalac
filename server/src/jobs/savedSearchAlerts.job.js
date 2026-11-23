import Content from '../modules/contents/content.model.js';
import SavedSearch from '../modules/savedSearches/savedSearch.model.js';
import { vietnameseSearchRegex } from '../utils/vietnameseSearch.js';
import { createNotification } from '../services/notification.service.js';
import { NOTIFICATION_TYPES } from '../constants/notificationTypes.js';
import { logger } from '../config/logger.js';

const PATH_BY_TYPE = {
  article: 'tin-tuc',
  community: 'cong-dong',
  property: 'bat-dong-san',
  job: 'viec-lam',
};
const BATCH_SIZE = 16;
let running = false;

export function buildSavedSearchContentFilter(search, now = new Date()) {
  const since = new Date(search.lastScannedAt || search.createdAt || now);
  const cursorId = search.lastScannedContentId || null;
  const timeCondition = cursorId ? {
    $or: [
      { publishedAt: { $gt: since, $lte: now } },
      { publishedAt: since, _id: { $gt: cursorId } },
    ],
  } : { publishedAt: { $gt: since, $lte: now } };

  const and = [timeCondition];
  const keyword = vietnameseSearchRegex(search.queryNormalized);
  if (keyword) and.push({ $or: [{ title: keyword }, { summary: keyword }] });

  return {
    status: 'published',
    visibility: 'public',
    deletedAt: null,
    ...(search.contentType !== 'all' ? { contentType: search.contentType } : {}),
    ...(search.areaId ? { primaryAreaId: search.areaId } : {}),
    $and: and,
  };
}

export async function sendSavedSearchAlerts() {
  if (running) return 0;
  running = true;
  let notified = 0;
  try {
    const searches = await SavedSearch.find({ isActive: true })
      .sort({ lastScannedAt: 1, _id: 1 }).limit(80).lean();
    for (const search of searches) {
      const now = new Date();
      try {
        const matches = await Content.find(buildSavedSearchContentFilter(search, now))
          .select('_id title slug contentType publishedAt').sort({ publishedAt: 1, _id: 1 })
          .limit(BATCH_SIZE).lean();

        for (const content of matches) {
          const section = PATH_BY_TYPE[content.contentType];
          if (!section || !content.slug) continue;
          await createNotification({
            recipientId: search.userId,
            notificationType: NOTIFICATION_TYPES.SAVED_SEARCH_MATCH,
            targetType: 'content',
            targetId: content._id,
            title: 'Có nội dung mới phù hợp với tìm kiếm đã lưu',
            message: String(content.title || '').slice(0, 250),
            payload: { url: '/' + section + '/' + encodeURIComponent(content.slug) },
            dedupeKey: 'saved-search:' + search._id + ':' + content._id,
          });
          notified += 1;
        }

        const hasMore = matches.length === BATCH_SIZE;
        const last = matches[matches.length - 1];
        await SavedSearch.updateOne(
          { _id: search._id, userId: search.userId, isActive: true },
          {
            $set: {
              lastScannedAt: hasMore ? last.publishedAt : now,
              lastScannedContentId: hasMore ? last._id : null,
            },
          },
        );
      } catch (error) {
        logger.warn({ err: error, savedSearchId: search._id }, 'Saved search alert check failed');
        // Keep the cursor unchanged for retry. Already-sent alerts dedupe by unique key.
      }
    }
    return notified;
  } finally {
    running = false;
  }
}
