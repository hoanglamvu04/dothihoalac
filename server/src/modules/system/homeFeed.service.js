import Content from '../contents/content.model.js';
import ContentBody from '../contents/contentBody.model.js';
import CommunityPost from '../community/communityPost.model.js';
import PropertyListing from '../properties/propertyListing.model.js';
import JobPost from '../jobs/jobPost.model.js';
import User from '../users/user.model.js';
import UserProfile from '../users/userProfile.model.js';
import Category from '../taxonomy/category.model.js';
import Area from '../taxonomy/area.model.js';
import Media from '../media/media.model.js';

const HOME_CACHE_TTL_MS = 15_000;
const ARTICLE_LIMIT = 10;
const COMMUNITY_LIMIT = 4;
const PROPERTY_LIMIT = 4;
const JOB_LIMIT = 3;
const PROPERTY_CANDIDATE_LIMIT = 24;

let cachedData = null;
let cachedAt = 0;
let inFlight = null;

function idOf(value) {
  return String(value?._id || value || '');
}

function mapById(items = [], key = '_id') {
  return new Map(
    items.map((item) => [idOf(item?.[key]), item]),
  );
}

function uniqueIds(values = []) {
  return [...new Set(values.map(idOf).filter(Boolean))];
}

const CARD_FIELDS = [
  'contentType',
  'title',
  'slug',
  'summary',
  'authorId',
  'primaryCategoryId',
  'primaryAreaId',
  'thumbnailMediaId',
  'isSponsored',
  'publishedAt',
  'createdAt',
  'viewCount',
  'commentCount',
  'reactionCount',
].join(' ');

const PUBLIC_CONTENT_FILTER = {
  status: 'published',
  visibility: 'public',
  deletedAt: null,
};

function contentProjection() {
  return {
    _id: 1,
    contentType: 1,
    title: 1,
    slug: 1,
    summary: 1,
    authorId: 1,
    primaryCategoryId: 1,
    primaryAreaId: 1,
    thumbnailMediaId: 1,
    isSponsored: 1,
    publishedAt: 1,
    createdAt: 1,
    viewCount: 1,
    commentCount: 1,
    reactionCount: 1,
  };
}

async function loadPropertyCards(now) {
  const rows = await PropertyListing.aggregate([
    {
      $match: {
        expiresAt: { $gt: now },
        soldAt: null,
        rentedAt: null,
      },
    },
    { $sort: { listingPriority: -1, createdAt: -1, _id: -1 } },
    { $limit: PROPERTY_CANDIDATE_LIMIT },
    {
      $lookup: {
        from: Content.collection.name,
        let: { contentId: '$contentId' },
        pipeline: [
          {
            $match: {
              $expr: { $eq: ['$_id', '$$contentId'] },
              contentType: 'property',
              ...PUBLIC_CONTENT_FILTER,
            },
          },
          { $project: contentProjection() },
        ],
        as: 'content',
      },
    },
    { $unwind: '$content' },
    { $limit: PROPERTY_LIMIT },
    {
      $project: {
        content: 1,
        contentId: 1,
        transactionType: 1,
        propertyType: 1,
        ownerType: 1,
        price: 1,
        priceUnit: 1,
        landArea: 1,
        bedrooms: 1,
        bathrooms: 1,
        legalStatus: 1,
        addressText: 1,
        contactName: 1,
      },
    },
  ]);

  return rows.map((row) => {
    const { content, ...property } = row;
    return { ...content, property };
  });
}

async function loadJobCards(now) {
  const rows = await JobPost.aggregate([
    {
      $match: {
        deadline: { $gte: now },
      },
    },
    {
      $lookup: {
        from: Content.collection.name,
        let: { contentId: '$contentId' },
        pipeline: [
          {
            $match: {
              $expr: { $eq: ['$_id', '$$contentId'] },
              contentType: 'job',
              ...PUBLIC_CONTENT_FILTER,
            },
          },
          { $project: contentProjection() },
        ],
        as: 'content',
      },
    },
    { $unwind: '$content' },
    {
      $sort: {
        'content.publishedAt': -1,
        'content._id': -1,
      },
    },
    { $limit: JOB_LIMIT },
    {
      $project: {
        content: 1,
        contentId: 1,
        companyName: 1,
        workLocation: 1,
      },
    },
  ]);

  return rows.map((row) => {
    const { content, ...job } = row;
    return { ...content, job };
  });
}

async function buildHomeFeed() {
  const now = new Date();

  const [articles, community, properties, jobs] = await Promise.all([
    Content.find({
      ...PUBLIC_CONTENT_FILTER,
      contentType: 'article',
    })
      .select(CARD_FIELDS)
      .sort({ publishedAt: -1, _id: -1 })
      .limit(ARTICLE_LIMIT)
      .lean(),

    Content.find({
      ...PUBLIC_CONTENT_FILTER,
      contentType: 'community',
    })
      .select(CARD_FIELDS)
      .sort({ publishedAt: -1, _id: -1 })
      .limit(COMMUNITY_LIMIT)
      .lean(),

    loadPropertyCards(now),
    loadJobCards(now),
  ]);

  const communityIds = community.map((item) => item._id);
  const authorIds = uniqueIds(community.map((item) => item.authorId));

  const [communityDetails, communityBodies, users, profiles] = await Promise.all([
    communityIds.length
      ? CommunityPost.find({ contentId: { $in: communityIds } })
          .select('contentId postType')
          .lean()
      : [],
    communityIds.length
      ? ContentBody.find({ contentId: { $in: communityIds } })
          .select('contentId bodyText inlineMediaIds')
          .lean()
      : [],
    authorIds.length
      ? User.find({ _id: { $in: authorIds }, deletedAt: null })
          .select('username displayName emailVerifiedAt phoneVerifiedAt')
          .lean()
      : [],
    authorIds.length
      ? UserProfile.find({ userId: { $in: authorIds } })
          .select('userId avatarMediaId')
          .populate('avatarMediaId', 'url secureUrl altText width height')
          .lean()
      : [],
  ]);

  const communityMap = mapById(communityDetails, 'contentId');
  const communityBodyMap = mapById(communityBodies, 'contentId');
  const userMap = mapById(users);
  const profileMap = mapById(profiles, 'userId');

  const allContent = [...articles, ...community, ...properties, ...jobs];
  const categoryIds = uniqueIds(articles.map((item) => item.primaryCategoryId));
  const areaIds = uniqueIds(allContent.map((item) => item.primaryAreaId));
  const communityInlineMediaIds = uniqueIds(
    communityBodies.flatMap((body) => body.inlineMediaIds || []),
  );
  const mediaIds = uniqueIds([
    ...allContent.map((item) => item.thumbnailMediaId),
    ...communityInlineMediaIds,
  ]);

  const [categories, areas, mediaItems] = await Promise.all([
    categoryIds.length
      ? Category.find({ _id: { $in: categoryIds } })
          .select('name slug')
          .lean()
      : [],
    areaIds.length
      ? Area.find({ _id: { $in: areaIds } })
          .select('name slug')
          .lean()
      : [],
    mediaIds.length
      ? Media.find({
          _id: { $in: mediaIds },
          deletedAt: null,
        })
          .select('url secureUrl altText width height')
          .lean()
      : [],
  ]);

  const categoryMap = mapById(categories);
  const areaMap = mapById(areas);
  const mediaMap = mapById(mediaItems);

  const hydrateCard = (item) => ({
    ...item,
    primaryCategoryId:
      categoryMap.get(idOf(item.primaryCategoryId)) || null,
    primaryAreaId:
      areaMap.get(idOf(item.primaryAreaId)) || null,
    thumbnailMediaId:
      mediaMap.get(idOf(item.thumbnailMediaId)) || null,
  });

  return {
    articles: articles.map(hydrateCard),
    community: community.map((item) => {
      const author = userMap.get(idOf(item.authorId)) || null;
      const body = communityBodyMap.get(idOf(item._id)) || null;
      const inlineMediaIds = (body?.inlineMediaIds || [])
        .map((mediaId) => mediaMap.get(idOf(mediaId)))
        .filter(Boolean);
      const hydrated = hydrateCard(item);

      return {
        ...hydrated,
        thumbnailMediaId:
          hydrated.thumbnailMediaId || inlineMediaIds[0] || null,
        authorId: author
          ? {
              ...author,
              profile: profileMap.get(idOf(author._id)) || null,
            }
          : null,
        community: communityMap.get(idOf(item._id)) || null,
        body: body
          ? {
              bodyText: body.bodyText || '',
              inlineMediaIds,
            }
          : null,
      };
    }),
    properties: properties.map(hydrateCard),
    jobs: jobs.map(hydrateCard),
  };
}

export async function homeFeed() {
  const now = Date.now();

  if (cachedData && now - cachedAt < HOME_CACHE_TTL_MS) {
    return cachedData;
  }

  if (inFlight) return inFlight;

  const request = buildHomeFeed()
    .then((data) => {
      cachedData = data;
      cachedAt = Date.now();
      return data;
    })
    .finally(() => {
      if (inFlight === request) inFlight = null;
    });

  inFlight = request;
  return request;
}
