import Content from '../contents/content.model.js';
import User from '../users/user.model.js';
import Area from '../taxonomy/area.model.js';
import { parsePagination, buildPaginationMeta } from '../../utils/pagination.js';
import { escapeRegex } from '../../utils/escapeRegex.js';

const CONTENT_TYPES = new Set([
  'article',
  'community',
  'property',
  'job',
]);

export async function search(query) {
  const q = String(query.q || '').trim();
  const { page, limit, skip } = parsePagination(query);

  if (!q) {
    return {
      items: [],
      users: [],
      areas: [],
      meta: buildPaginationMeta({ page, limit, total: 0 }),
    };
  }

  const regex = new RegExp(escapeRegex(q), 'i');
  const requestedType = String(query.type || 'all');
  const searchesContent =
    requestedType === 'all' || CONTENT_TYPES.has(requestedType);

  const filter = {
    status: 'published',
    visibility: 'public',
    deletedAt: null,
    $or: [{ title: regex }, { summary: regex }, { bodyText: regex }],
  };

  if (CONTENT_TYPES.has(requestedType)) {
    filter.contentType = requestedType;
  }

  if (query.area) filter.primaryAreaId = query.area;

  const contentPromise = searchesContent
    ? Content.find(filter)
        .populate('authorId', 'username displayName')
        .populate('primaryAreaId', 'name slug')
        .populate('primaryCategoryId', 'name slug')
        .populate(
          'thumbnailMediaId',
          'url secureUrl altText width height resourceType',
        )
        .sort({ publishedAt: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
    : Promise.resolve([]);

  const totalPromise = searchesContent
    ? Content.countDocuments(filter)
    : Promise.resolve(0);

  const [items, total, users, areas] = await Promise.all([
    contentPromise,
    totalPromise,
    requestedType === 'all' || requestedType === 'user'
      ? User.find({
          deletedAt: null,
          status: 'active',
          $or: [{ username: regex }, { displayName: regex }],
        })
          .select('username displayName emailVerifiedAt phoneVerifiedAt')
          .limit(20)
          .lean()
      : [],
    requestedType === 'all' || requestedType === 'area'
      ? Area.find({ isActive: true, name: regex })
          .limit(20)
          .lean()
      : [],
  ]);

  const auxiliaryTotal =
    requestedType === 'user'
      ? users.length
      : requestedType === 'area'
        ? areas.length
        : total;

  return {
    items,
    users,
    areas,
    meta: buildPaginationMeta({
      page,
      limit,
      total: auxiliaryTotal,
    }),
  };
}
