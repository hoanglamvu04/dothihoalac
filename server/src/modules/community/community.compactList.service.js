import Content from '../contents/content.model.js';
import CommunityPost from './communityPost.model.js';
import UserProfile from '../users/userProfile.model.js';

import {
  parsePagination,
  buildPaginationMeta,
} from '../../utils/pagination.js';

function escapeRegex(value = '') {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function loadAvatarProfiles(userIds = []) {
  const uniqueIds = [...new Set(userIds.filter(Boolean).map(String))];
  if (!uniqueIds.length) return new Map();

  const profiles = await UserProfile.find({
    userId: { $in: uniqueIds },
  })
    .select('userId avatarMediaId')
    .populate('avatarMediaId', 'url secureUrl altText width height')
    .lean();

  return new Map(
    profiles.map((profile) => [String(profile.userId), profile]),
  );
}

function attachProfile(user, profileMap) {
  if (!user) return user;
  const plain = typeof user.toObject === 'function' ? user.toObject() : user;

  return {
    ...plain,
    profile: profileMap.get(String(plain._id || plain.id)) || null,
  };
}

export async function listCompactCommunity(query = {}) {
  const { page, limit, skip } = parsePagination(query);

  const filter = {
    contentType: 'community',
    status: 'published',
    visibility: 'public',
    deletedAt: null,
  };

  if (query.area) filter.primaryAreaId = query.area;
  if (query.category) filter.primaryCategoryId = query.category;

  const queryText = String(query.q || '').trim();
  if (queryText) {
    const regex = new RegExp(escapeRegex(queryText), 'i');
    filter.$or = [
      { title: regex },
      { summary: regex },
    ];
  }

  if (query.type) {
    const ids = (
      await CommunityPost.find({ postType: query.type })
        .select('contentId')
        .lean()
    ).map((item) => item.contentId);

    filter._id = { $in: ids };
  }

  const [items, total] = await Promise.all([
    Content.find(filter)
      .populate(
        'authorId',
        'username displayName emailVerifiedAt phoneVerifiedAt',
      )
      .populate('primaryAreaId', 'name slug')
      .populate('primaryCategoryId', 'name slug')
      .populate('thumbnailMediaId', 'url secureUrl altText width height')
      .sort(
        query.sort === 'popular'
          ? {
              reactionCount: -1,
              commentCount: -1,
              publishedAt: -1,
              _id: -1,
            }
          : { publishedAt: -1, _id: -1 },
      )
      .skip(skip)
      .limit(limit)
      .lean(),
    Content.countDocuments(filter),
  ]);

  if (!items.length) {
    return {
      items: [],
      meta: buildPaginationMeta({ page, limit, total }),
    };
  }

  const contentIds = items.map((item) => item._id);
  const [details, profileMap] = await Promise.all([
    CommunityPost.find({ contentId: { $in: contentIds } }).lean(),
    loadAvatarProfiles(items.map((item) => item.authorId?._id)),
  ]);

  const detailMap = new Map(
    details.map((detail) => [String(detail.contentId), detail]),
  );

  return {
    items: items.map((item) => ({
      ...item,
      authorId: attachProfile(item.authorId, profileMap),
      community: detailMap.get(String(item._id)) || null,
      body: null,
      commentPreview: [],
      viewerReaction: null,
    })),
    meta: buildPaginationMeta({ page, limit, total }),
  };
}
