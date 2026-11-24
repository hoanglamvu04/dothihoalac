import mongoose from 'mongoose';
import Content from '../contents/content.model.js';
import User from '../users/user.model.js';
import Area from '../taxonomy/area.model.js';
import { parsePagination, buildPaginationMeta } from '../../utils/pagination.js';
import { foldVietnamese, normalizeSearchQuery, vietnameseSearchRegex } from '../../utils/vietnameseSearch.js';
import ApiError from '../../utils/ApiError.js';

const CONTENT_TYPES = ['article', 'community', 'property', 'job'];
const CONTENT_TYPE_SET = new Set(CONTENT_TYPES);
const SORT_VALUES = new Set(['relevance', 'newest']);

function normalizeSort(value) {
  return SORT_VALUES.has(String(value || '')) ? String(value) : 'relevance';
}

function buildContentFilter({ q, regex, useTextIndex, area }) {
  const filter = {
    status: 'published',
    visibility: 'public',
    deletedAt: null,
  };

  if (useTextIndex) {
    filter.$text = { $search: q };
  } else if (regex) {
    filter.$or = [{ title: regex }, { summary: regex }, { bodyText: regex }];
  }

  if (area) filter.primaryAreaId = area;

  return filter;
}

function buildContentSort({ useTextIndex, sort }) {
  if (sort === 'newest' || !useTextIndex) {
    return { publishedAt: -1, createdAt: -1, _id: -1 };
  }

  return {
    score: { $meta: 'textScore' },
    publishedAt: -1,
    _id: -1,
  };
}

function buildUserFilter(regex) {
  return {
    deletedAt: null,
    status: 'active',
    $or: [{ username: regex }, { displayName: regex }],
  };
}

function buildAreaFilter(regex) {
  return {
    isActive: true,
    name: regex,
  };
}

export async function search(query) {
  const q = String(query.q || '').trim();
  if (q.length > 100) throw new ApiError(422, 'Từ khóa quá dài.', 'SEARCH_QUERY_TOO_LONG');

  const areaInput = String(query.area || '').trim();
  if (areaInput.length > 100) throw new ApiError(422, 'Khu vực không hợp lệ.', 'SEARCH_AREA_INVALID');
  const area = areaInput
    ? mongoose.isValidObjectId(areaInput)
      ? areaInput
      : (await Area.findOne({ slug: areaInput.toLowerCase(), isActive: true }).select('_id').lean())?._id
    : null;
  const { page, limit, skip } = parsePagination(query);

  if (!q && !areaInput) {
    return {
      items: [],
      users: [],
      areas: [],
      facets: {
        all: 0,
        article: 0,
        community: 0,
        property: 0,
        job: 0,
        user: 0,
        area: 0,
      },
      sort: normalizeSort(query.sort),
      meta: buildPaginationMeta({ page, limit, total: 0 }),
    };
  }

  const expanded = normalizeSearchQuery(q);
  // Punctuation-only requests must not become unrestricted public content queries.
  if (q && !expanded) {
    throw new ApiError(422, 'Từ khóa không hợp lệ.', 'SEARCH_QUERY_INVALID');
  }
  const regex = q ? vietnameseSearchRegex(q) : null;
  const requestedType = String(query.type || 'all');
  const sort = normalizeSort(query.sort);
  const searchesContent = requestedType === 'all' || CONTENT_TYPE_SET.has(requestedType);
  // Mongo text-index search is the fast path. A bounded, escaped Vietnamese
  // regex fallback handles prefix searches and older content that text search misses.
  const useTextIndex = Boolean(searchesContent && q && expanded === foldVietnamese(q) && expanded.length >= 2 && await Content.exists({
    status: 'published', visibility: 'public', deletedAt: null,
    ...(area ? { primaryAreaId: area } : {}),
    $text: { $search: expanded },
  }));

  const baseContentFilter = buildContentFilter({
    q: expanded,
    regex,
    useTextIndex,
    area: areaInput ? area || new mongoose.Types.ObjectId('000000000000000000000000') : null,
  });
  const selectedContentFilter = CONTENT_TYPE_SET.has(requestedType)
    ? { ...baseContentFilter, contentType: requestedType }
    : baseContentFilter;
  const userFilter = q ? buildUserFilter(regex) : null;
  const areaFilter = q ? buildAreaFilter(regex) : null;

  const contentPromise = searchesContent
    ? Content.find(selectedContentFilter)
        .populate('authorId', 'username displayName')
        .populate('primaryAreaId', 'name slug')
        .populate('primaryCategoryId', 'name slug')
        .populate(
          'thumbnailMediaId',
          'url secureUrl altText width height resourceType',
        )
        .sort(buildContentSort({ useTextIndex, sort }))
        .skip(skip)
        .limit(limit)
        .lean()
    : Promise.resolve([]);

  const selectedContentTotalPromise = searchesContent
    ? Content.countDocuments(selectedContentFilter)
    : Promise.resolve(0);

  const contentFacetPromises = CONTENT_TYPES.map((contentType) =>
    Content.countDocuments({ ...baseContentFilter, contentType }),
  );

  const userTotalPromise = q ? User.countDocuments(userFilter) : Promise.resolve(0);
  const areaTotalPromise = q ? Area.countDocuments(areaFilter) : Promise.resolve(0);

  const usersPromise = q && (requestedType === 'all' || requestedType === 'user')
    ? User.find(userFilter)
        .select('username displayName emailVerifiedAt phoneVerifiedAt')
        .sort({ displayName: 1, username: 1, _id: 1 })
        .skip(requestedType === 'user' ? skip : 0)
        .limit(requestedType === 'user' ? limit : Math.min(limit, 6))
        .lean()
    : Promise.resolve([]);

  const areasPromise = q && (requestedType === 'all' || requestedType === 'area')
    ? Area.find(areaFilter)
        .select('name slug areaType parentId description')
        .sort({ name: 1, _id: 1 })
        .skip(requestedType === 'area' ? skip : 0)
        .limit(requestedType === 'area' ? limit : Math.min(limit, 6))
        .lean()
    : Promise.resolve([]);

  const [
    items,
    selectedContentTotal,
    contentFacetValues,
    userTotal,
    areaTotal,
    users,
    areas,
  ] = await Promise.all([
    contentPromise,
    selectedContentTotalPromise,
    Promise.all(contentFacetPromises),
    userTotalPromise,
    areaTotalPromise,
    usersPromise,
    areasPromise,
  ]);

  const contentFacets = Object.fromEntries(
    CONTENT_TYPES.map((contentType, index) => [
      contentType,
      Number(contentFacetValues[index] || 0),
    ]),
  );
  const contentTotal = Object.values(contentFacets).reduce(
    (sum, value) => sum + Number(value || 0),
    0,
  );

  const facets = {
    all: contentTotal + Number(userTotal || 0) + Number(areaTotal || 0),
    ...contentFacets,
    user: Number(userTotal || 0),
    area: Number(areaTotal || 0),
  };

  const selectedTotal = requestedType === 'user'
    ? facets.user
    : requestedType === 'area'
      ? facets.area
      : requestedType === 'all'
        ? selectedContentTotal
        : facets[requestedType] || 0;

  return {
    items,
    users,
    areas,
    facets,
    sort,
    suggestion: q && expanded !== foldVietnamese(q) ? expanded : null,
    meta: buildPaginationMeta({
      page,
      limit,
      total: selectedTotal,
    }),
  };
}
