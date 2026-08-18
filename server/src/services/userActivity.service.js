import UserActivity, {
  USER_ACTIVITY_TYPES,
} from '../modules/users/userActivity.model.js';

const SEARCH_DEDUPE_WINDOW_MS = 5 * 60 * 1000;

export async function recordSearchActivity(userId, input = {}) {
  if (!userId) return null;

  const query = String(input.q || '')
    .trim()
    .replace(/\s+/g, ' ')
    .slice(0, 180);

  if (!query) return null;

  const searchType = String(input.type || 'all')
    .trim()
    .slice(0, 40) || 'all';

  const latest = await UserActivity.findOne({
    userId,
    activityType: USER_ACTIVITY_TYPES.SEARCH,
  })
    .sort({ occurredAt: -1 })
    .lean();

  if (
    latest &&
    latest.query.toLocaleLowerCase('vi') === query.toLocaleLowerCase('vi') &&
    String(latest.payload?.type || 'all') === searchType &&
    Date.now() - new Date(latest.occurredAt).getTime() < SEARCH_DEDUPE_WINDOW_MS
  ) {
    return UserActivity.findByIdAndUpdate(
      latest._id,
      {
        occurredAt: new Date(),
        payload: {
          ...(latest.payload || {}),
          type: searchType,
        },
      },
      { new: true },
    );
  }

  return UserActivity.create({
    userId,
    activityType: USER_ACTIVITY_TYPES.SEARCH,
    query,
    payload: { type: searchType },
    occurredAt: new Date(),
  });
}
