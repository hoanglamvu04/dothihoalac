import User from './user.model.js';
import UserProfile from './userProfile.model.js';
import UserSession from './userSession.model.js';
import UsernameHistory from './usernameHistory.model.js';
import UserActivity, {
  USER_ACTIVITY_TYPES,
} from './userActivity.model.js';
import Content from '../contents/content.model.js';
import ContentBody from '../contents/contentBody.model.js';
import PropertyListing from '../properties/propertyListing.model.js';
import Media from '../media/media.model.js';
import Bookmark from '../bookmarks/bookmark.model.js';
import Report from '../reports/report.model.js';
import Comment from '../comments/comment.model.js';
import Reaction from '../reactions/reaction.model.js';
import { extractInlineMediaFigures } from '../media/inlineMedia.service.js';
import { env } from '../../config/env.js';
import { parsePagination, buildPaginationMeta } from '../../utils/pagination.js';
import ApiError from '../../utils/ApiError.js';

const MEMBER_CONTENT_TYPES = new Set(['community', 'property', 'job', 'article']);
const ACTIVITY_TYPES = new Set(['all', 'search', 'comment', 'like']);

export async function getPublicProfile(username) {
  const user = await User.findOne({
    username: username.toLowerCase(),
    deletedAt: null,
    status: { $ne: 'banned' },
  }).lean();
  if (!user) throw new ApiError(404, 'Không tìm thấy thành viên.', 'USER_NOT_FOUND');
  const profile = await UserProfile.findOne({ userId: user._id, publicProfile: true })
    .populate('avatarMediaId coverMediaId areaId')
    .lean();
  if (!profile) throw new ApiError(404, 'Hồ sơ không công khai.', 'PROFILE_PRIVATE');
  const [postCount, listingCount] = await Promise.all([
    Content.countDocuments({ authorId: user._id, status: 'published', deletedAt: null }),
    Content.countDocuments({
      authorId: user._id,
      contentType: 'property',
      status: 'published',
      deletedAt: null,
    }),
  ]);
  return {
    user: {
      id: user._id,
      username: user.username,
      displayName: user.displayName,
      emailVerifiedAt: user.emailVerifiedAt,
      phoneVerifiedAt: user.phoneVerifiedAt,
      createdAt: user.createdAt,
    },
    profile,
    counts: { postCount, listingCount },
  };
}

export async function getPrivateProfile(userId) {
  return UserProfile.findOne({ userId }).populate('avatarMediaId coverMediaId areaId').lean();
}

export async function updateProfile(user, data) {
  if (data.displayName !== undefined) {
    user.displayName = data.displayName;
    await user.save();
  }
  const profileData = { ...data };
  delete profileData.displayName;
  return UserProfile.findOneAndUpdate({ userId: user._id }, profileData, {
    new: true,
    upsert: true,
    runValidators: true,
  }).populate('avatarMediaId coverMediaId areaId');
}

export async function changeUsername(user, username) {
  const exists = await User.exists({ username, _id: { $ne: user._id } });
  if (exists) throw new ApiError(409, 'Tên người dùng đã tồn tại.', 'USERNAME_EXISTS');
  const latest = await UsernameHistory.findOne({ userId: user._id }).sort({ changedAt: -1 }).lean();
  const cooldown = env.USERNAME_CHANGE_COOLDOWN_DAYS * 24 * 60 * 60 * 1000;
  if (latest && Date.now() - new Date(latest.changedAt).getTime() < cooldown)
    throw new ApiError(
      429,
      `Bạn chỉ được đổi tên người dùng mỗi ${env.USERNAME_CHANGE_COOLDOWN_DAYS} ngày.`,
      'USERNAME_COOLDOWN',
    );
  const oldUsername = user.username;
  user.username = username;
  await user.save();
  await UsernameHistory.create({ userId: user._id, oldUsername, newUsername: username });
  return { username };
}

export async function listSessions(userId) {
  return UserSession.find({ userId, revokedAt: null, expiresAt: { $gt: new Date() } })
    .select('-refreshTokenHash')
    .sort({ lastActiveAt: -1 })
    .lean();
}

export async function revokeSession(userId, sessionId) {
  const result = await UserSession.updateOne({ _id: sessionId, userId }, { revokedAt: new Date() });
  if (!result.matchedCount)
    throw new ApiError(404, 'Không tìm thấy phiên đăng nhập.', 'SESSION_NOT_FOUND');
}

async function loadCommunityCoverFallback(items = []) {
  const targets = items.filter(
    (item) => item.contentType === 'community' && !item.thumbnailMediaId,
  );

  if (!targets.length) return new Map();

  const bodies = await ContentBody.find({
    contentId: { $in: targets.map((item) => item._id) },
  })
    .select('contentId bodyHtml inlineMediaIds')
    .populate('inlineMediaIds', 'url secureUrl altText width height')
    .lean();

  const result = new Map();
  const legacyFirstIds = new Map();
  const legacyMediaIds = new Set();

  for (const body of bodies) {
    const firstInline = Array.isArray(body.inlineMediaIds)
      ? body.inlineMediaIds[0]
      : null;

    if (firstInline) {
      result.set(String(body.contentId), firstInline);
      continue;
    }

    if (!body.bodyHtml || !/<figure\b/i.test(body.bodyHtml)) continue;

    try {
      const first = extractInlineMediaFigures(body.bodyHtml)[0];
      const mediaId = String(first?.mediaId || '').trim();

      if (mediaId) {
        legacyFirstIds.set(String(body.contentId), mediaId);
        legacyMediaIds.add(mediaId);
      }
    } catch {
      // Dữ liệu bài cũ không hợp lệ thì giữ fallback icon thay vì làm hỏng trang tài khoản.
    }
  }

  if (legacyMediaIds.size) {
    const media = await Media.find({
      _id: { $in: [...legacyMediaIds] },
      resourceType: 'image',
      status: 'active',
      deletedAt: null,
    })
      .select('_id url secureUrl altText width height')
      .lean();

    const mediaMap = new Map(
      media.map((item) => [String(item._id), item]),
    );

    for (const [contentId, mediaId] of legacyFirstIds) {
      const item = mediaMap.get(mediaId);
      if (item) result.set(contentId, item);
    }
  }

  return result;
}

function buildPublicUrl(item) {
  if (!item?.slug) return '';

  if (item.contentType === 'article') {
    return `/tin-tuc/${encodeURIComponent(item.slug)}`;
  }

  if (item.contentType === 'community') {
    const username = String(item.authorId?.username || '').trim();
    return username
      ? `/cong-dong/${encodeURIComponent(username)}/${encodeURIComponent(item.slug)}`
      : `/cong-dong/${encodeURIComponent(item.slug)}`;
  }

  if (item.contentType === 'property') {
    return `/bat-dong-san/${encodeURIComponent(item.slug)}`;
  }

  if (item.contentType === 'job') {
    return `/viec-lam/${encodeURIComponent(item.slug)}`;
  }

  return '';
}

function withPublicUrl(item) {
  if (!item) return null;
  return {
    ...item,
    publicUrl: buildPublicUrl(item),
  };
}

async function listContents(userId, query, contentType) {
  const { page, limit, skip } = parsePagination(query);
  const requestedType = contentType || String(query.type || '').trim();
  const filter = {
    authorId: userId,
    deletedAt: null,
    ...(requestedType && MEMBER_CONTENT_TYPES.has(requestedType)
      ? { contentType: requestedType }
      : {}),
  };

  if (query.status) filter.status = query.status;

  const [items, total] = await Promise.all([
    Content.find(filter)
      .populate('authorId', 'username displayName')
      .populate('thumbnailMediaId', 'url secureUrl altText width height')
      .sort({ updatedAt: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Content.countDocuments(filter),
  ]);

  const fallbackCoverMap = await loadCommunityCoverFallback(items);

  return {
    items: items.map((item) => ({
      ...item,
      thumbnailMediaId:
        item.thumbnailMediaId ||
        fallbackCoverMap.get(String(item._id)) ||
        null,
      publicUrl: buildPublicUrl(item),
    })),
    meta: buildPaginationMeta({ page, limit, total }),
  };
}

export const listMyPosts = (userId, query) => listContents(userId, query);

export async function listMyListings(userId, query) {
  const result = await listContents(userId, query, 'property');
  const contentIds = result.items.map((item) => item._id);

  if (!contentIds.length) return result;

  const [properties, bodies] = await Promise.all([
    PropertyListing.find({ contentId: { $in: contentIds } })
      .populate('galleryMediaIds', 'url secureUrl altText width height resourceType')
      .lean(),
    ContentBody.find({ contentId: { $in: contentIds } })
      .select('contentId bodyHtml')
      .lean(),
  ]);

  const propertyMap = new Map(
    properties.map((property) => [String(property.contentId), property]),
  );
  const bodyMap = new Map(
    bodies.map((body) => [String(body.contentId), body.bodyHtml || '']),
  );

  return {
    ...result,
    items: result.items.map((item) => ({
      ...item,
      bodyHtml: bodyMap.get(String(item._id)) || '',
      property: propertyMap.get(String(item._id)) || null,
    })),
  };
}

export async function listMyBookmarks(userId, query) {
  const { page, limit, skip } = parsePagination(query);
  const [items, total] = await Promise.all([
    Bookmark.find({ userId })
      .populate('contentId')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Bookmark.countDocuments({ userId }),
  ]);
  return { items, meta: buildPaginationMeta({ page, limit, total }) };
}

export async function listMyReports(userId, query) {
  const { page, limit, skip } = parsePagination(query);
  const [items, total] = await Promise.all([
    Report.find({ reporterId: userId }).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Report.countDocuments({ reporterId: userId }),
  ]);
  return { items, meta: buildPaginationMeta({ page, limit, total }) };
}

async function listSearchActivity(userId, query) {
  const { page, limit, skip } = parsePagination(query, { limit: 20 });
  const filter = {
    userId,
    activityType: USER_ACTIVITY_TYPES.SEARCH,
  };

  const [rows, total] = await Promise.all([
    UserActivity.find(filter)
      .sort({ occurredAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    UserActivity.countDocuments(filter),
  ]);

  return {
    items: rows.map((row) => ({
      _id: row._id,
      activityType: 'search',
      occurredAt: row.occurredAt || row.createdAt,
      query: row.query,
      searchType: row.payload?.type || 'all',
    })),
    meta: buildPaginationMeta({ page, limit, total }),
  };
}

async function listCommentActivity(userId, query) {
  const { page, limit, skip } = parsePagination(query, { limit: 20 });
  const filter = {
    userId,
    deletedAt: null,
    status: { $ne: 'deleted' },
  };

  const [rows, total] = await Promise.all([
    Comment.find(filter)
      .populate({
        path: 'contentId',
        select:
          'title slug contentType thumbnailMediaId primaryCategoryId authorId status deletedAt',
        populate: [
          {
            path: 'thumbnailMediaId',
            select: 'url secureUrl altText width height',
          },
          {
            path: 'primaryCategoryId',
            select: 'name slug',
          },
          {
            path: 'authorId',
            select: 'username displayName',
          },
        ],
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Comment.countDocuments(filter),
  ]);

  return {
    items: rows.map((row) => ({
      _id: row._id,
      activityType: 'comment',
      occurredAt: row.createdAt,
      body: row.body,
      editedAt: row.editedAt,
      parentId: row.parentId,
      content: withPublicUrl(row.contentId),
    })),
    meta: buildPaginationMeta({ page, limit, total }),
  };
}

async function listLikeActivity(userId, query) {
  const { page, limit, skip } = parsePagination(query, { limit: 20 });
  const filter = {
    userId,
    targetType: 'content',
    reactionType: 'like',
  };

  const [rows, total] = await Promise.all([
    Reaction.find(filter)
      .sort({ updatedAt: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Reaction.countDocuments(filter),
  ]);

  const contentIds = rows.map((row) => row.targetId);
  const contents = contentIds.length
    ? await Content.find({
        _id: { $in: contentIds },
        deletedAt: null,
      })
        .select(
          'title slug contentType summary thumbnailMediaId primaryCategoryId authorId status',
        )
        .populate('thumbnailMediaId', 'url secureUrl altText width height')
        .populate('primaryCategoryId', 'name slug')
        .populate('authorId', 'username displayName')
        .lean()
    : [];

  const contentMap = new Map(
    contents.map((item) => [String(item._id), item]),
  );

  return {
    items: rows.map((row) => ({
      _id: row._id,
      activityType: 'like',
      occurredAt: row.updatedAt || row.createdAt,
      reactionType: row.reactionType,
      content: withPublicUrl(contentMap.get(String(row.targetId)) || null),
    })),
    meta: buildPaginationMeta({ page, limit, total }),
  };
}

async function activityCounts(userId) {
  const [searches, comments, likes] = await Promise.all([
    UserActivity.countDocuments({
      userId,
      activityType: USER_ACTIVITY_TYPES.SEARCH,
    }),
    Comment.countDocuments({
      userId,
      deletedAt: null,
      status: { $ne: 'deleted' },
    }),
    Reaction.countDocuments({
      userId,
      targetType: 'content',
      reactionType: 'like',
    }),
  ]);

  return {
    searches,
    comments,
    likes,
    total: searches + comments + likes,
  };
}

export async function listMyActivity(userId, query = {}) {
  const requestedType = String(query.type || 'all').trim().toLowerCase();
  const type = ACTIVITY_TYPES.has(requestedType) ? requestedType : 'all';
  const summary = await activityCounts(userId);

  if (type === 'search') {
    const result = await listSearchActivity(userId, query);
    return { ...result, summary };
  }

  if (type === 'comment') {
    const result = await listCommentActivity(userId, query);
    return { ...result, summary };
  }

  if (type === 'like') {
    const result = await listLikeActivity(userId, query);
    return { ...result, summary };
  }

  const previewQuery = { page: 1, limit: 6 };
  const [searches, comments, likes] = await Promise.all([
    listSearchActivity(userId, previewQuery),
    listCommentActivity(userId, previewQuery),
    listLikeActivity(userId, previewQuery),
  ]);

  const items = [
    ...searches.items,
    ...comments.items,
    ...likes.items,
  ]
    .sort(
      (a, b) =>
        new Date(b.occurredAt || 0).getTime() -
        new Date(a.occurredAt || 0).getTime(),
    )
    .slice(0, 12);

  return {
    items,
    meta: buildPaginationMeta({
      page: 1,
      limit: 12,
      total: summary.total,
    }),
    summary,
  };
}

export async function clearMySearchActivity(userId) {
  const result = await UserActivity.deleteMany({
    userId,
    activityType: USER_ACTIVITY_TYPES.SEARCH,
  });

  return { deleted: result.deletedCount || 0 };
}
