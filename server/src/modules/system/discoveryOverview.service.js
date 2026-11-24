import Content from '../contents/content.model.js';
import Area from '../taxonomy/area.model.js';
import SavedSearch from '../savedSearches/savedSearch.model.js';
import Notification from '../notifications/notification.model.js';
import ApiError from '../../utils/ApiError.js';

export function parseDiscoveryWindow(value, now = new Date()) {
  const days = value === undefined || value === '' ? 30 : Number(value);
  if (![7, 30, 90].includes(days)) {
    throw new ApiError(422, 'Khoảng thời gian chỉ nhận 7, 30 hoặc 90 ngày.', 'DISCOVERY_DAYS_INVALID');
  }
  return { days, since: new Date(now.getTime() - days * 86400000) };
}

// Admin-only aggregate operational metrics. No raw user queries, session
// identifiers, email, IP, phone or consent-less behavioral tracking exposed.
export async function discoveryOverview(daysInput) {
  const { days, since } = parseDiscoveryWindow(daysInput);
  const publicFilter = {
    status: 'published', visibility: 'public', deletedAt: null,
    publishedAt: { $gte: since },
  };
  const recentFilter = { createdAt: { $gte: since }, deletedAt: null };
  const [
    published, pendingReview, missingImage, missingArea, missingSummary,
    activeSavedSearches, deliveredAlerts, byType, topAreaCounts,
  ] = await Promise.all([
    Content.countDocuments(publicFilter),
    Content.countDocuments({ status: 'pending_review', deletedAt: null }),
    Content.countDocuments({ ...publicFilter, thumbnailMediaId: null }),
    Content.countDocuments({ ...publicFilter, primaryAreaId: null }),
    Content.countDocuments({ ...publicFilter, $or: [{ summary: '' }, { summary: null }] }),
    SavedSearch.countDocuments({ isActive: true }),
    Notification.countDocuments({
      notificationType: 'saved_search_match', createdAt: { $gte: since },
      deletedAt: null,
    }),
    Content.aggregate([
      { $match: { ...recentFilter, contentType: { $in: ['article', 'community', 'property', 'job'] } } },
      { $group: { _id: '$contentType', count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]).option({ maxTimeMS: 6000 }),
    Content.aggregate([
      { $match: { ...publicFilter, primaryAreaId: { $ne: null } } },
      { $group: { _id: '$primaryAreaId', count: { $sum: 1 } } },
      { $sort: { count: -1, _id: 1 } },
      { $limit: 8 },
    ]).option({ maxTimeMS: 6000 }),
  ]);
  const areaDocs = topAreaCounts.length
    ? await Area.find({ _id: { $in: topAreaCounts.map((row) => row._id) }, isActive: true })
      .select('_id name slug').lean()
    : [];
  const names = new Map(areaDocs.map((area) => [String(area._id), area]));
  return {
    days, published, pendingReview, missingImage, missingArea, missingSummary,
    activeSavedSearches, deliveredAlerts,
    byType: Object.fromEntries(byType.map((row) => [row._id, row.count])),
    topAreas: topAreaCounts
      .filter((row) => names.has(String(row._id)))
      .map((row) => ({
        name: names.get(String(row._id)).name,
        slug: names.get(String(row._id)).slug,
        count: row.count,
      })),
    // No user-level behavioral statistics: WA-002/WA-005 consent gate is separate.
    personalAnalyticsIncluded: false,
  };
}
