import Content from '../contents/content.model.js';
import ApiError from '../../utils/ApiError.js';

const TRANSACTIONS = new Set(['sale', 'rent', 'transfer', 'wanted_buy', 'wanted_rent']);
const PROPERTY_TYPES = new Set([
  'house', 'villa_townhouse', 'street_house', 'shophouse', 'project_land',
  'land', 'farm_resort', 'condotel', 'warehouse', 'other_property',
  'residential_land', 'land_plot', 'service_land', 'townhouse',
  'villa', 'apartment', 'mini_apartment', 'room', 'whole_house',
  'commercial_space', 'office', 'farm',
]);

function parseBound(value, name, max) {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string' && typeof value !== 'number') {
    throw new ApiError(422, 'Bộ lọc ' + name + ' không hợp lệ.', 'SEARCH_FILTER_INVALID');
  }
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0 || number > max) {
    throw new ApiError(422, 'Bộ lọc ' + name + ' không hợp lệ.', 'SEARCH_FILTER_INVALID');
  }
  return number;
}

export function parseSearchFilters(query = {}, now = new Date()) {
  const days = query.days === undefined || query.days === '' ? 0 : Number(query.days);
  if (![0, 7, 30, 90].includes(days)) {
    throw new ApiError(422, 'Khoảng thời gian không hợp lệ.', 'SEARCH_FILTER_INVALID');
  }
  const since = days ? new Date(now.getTime() - days * 86400000) : null;
  const propertyType = String(query.propertyType || '');
  const transactionType = String(query.transactionType || '');
  if ((propertyType && !PROPERTY_TYPES.has(propertyType)) ||
      (transactionType && !TRANSACTIONS.has(transactionType))) {
    throw new ApiError(422, 'Loại bất động sản không hợp lệ.', 'SEARCH_FILTER_INVALID');
  }
  const minPrice = parseBound(query.minPrice, 'giá tối thiểu', 1e15);
  const maxPrice = parseBound(query.maxPrice, 'giá tối đa', 1e15);
  const minArea = parseBound(query.minArea, 'diện tích tối thiểu', 1e9);
  const maxArea = parseBound(query.maxArea, 'diện tích tối đa', 1e9);
  if ((minPrice !== null && maxPrice !== null && minPrice > maxPrice) ||
      (minArea !== null && maxArea !== null && minArea > maxArea)) {
    throw new ApiError(422, 'Bộ lọc tối thiểu lớn hơn tối đa.', 'SEARCH_FILTER_RANGE');
  }
  const hasPropertyFilters = Boolean(propertyType || transactionType ||
    minPrice !== null || maxPrice !== null || minArea !== null || maxArea !== null ||
    ['price_asc', 'price_desc'].includes(String(query.sort || '')));
  if (hasPropertyFilters && String(query.type || 'all') !== 'property') {
    throw new ApiError(422, 'Bộ lọc giá/diện tích chỉ áp dụng cho bất động sản.', 'SEARCH_FILTER_TYPE');
  }
  const listing = {
    soldAt: null,
    rentedAt: null,
    expiresAt: { $gt: now },
    ...(propertyType ? { propertyType } : {}),
    ...(transactionType ? { transactionType } : {}),
  };
  if (minPrice !== null || maxPrice !== null) {
    listing.priceUnit = 'total'; // VND total price only, not per month or per sqm.
    listing.isNegotiable = false;
    listing.price = {
      ...(minPrice !== null ? { $gte: minPrice } : {}),
      ...(maxPrice !== null ? { $lte: maxPrice } : {}),
    };
  }
  if (minArea !== null || maxArea !== null) {
    listing.landArea = {
      ...(minArea !== null ? { $gte: minArea } : {}),
      ...(maxArea !== null ? { $lte: maxArea } : {}),
    };
  }
  return { since, propertyListingFilter: hasPropertyFilters ? listing : null };
}

export async function findFilteredProperties({ contentFilter, listingFilter, sort, skip, limit }) {
  // Join from filtered, published PUBLIC contents. Do not materialize or cap
  // an unbounded list of property IDs, which would corrupt pagination/count.
  const sortStep = sort === 'price_asc' ? { listingPrice: 1, _id: -1 }
    : sort === 'price_desc' ? { listingPrice: -1, _id: -1 }
      : sort === 'popular' ? { viewCount: -1, publishedAt: -1, _id: -1 }
        : { publishedAt: -1, createdAt: -1, _id: -1 };
  const [result] = await Content.aggregate([
    { $match: { ...contentFilter, contentType: 'property' } },
    { $lookup: {
      from: 'propertylistings', localField: '_id', foreignField: 'contentId', as: 'listing',
    } },
    { $match: { listing: { $elemMatch: listingFilter } } },
    { $addFields: { listingPrice: { $arrayElemAt: ['$listing.price', 0] } } },
    { $facet: {
      items: [
        { $sort: sortStep }, { $skip: skip }, { $limit: limit },
        // Aggregation ignores schema select:false; never leak bodyText.
        { $project: { listing: 0, listingPrice: 0, bodyText: 0 } },
      ],
      count: [{ $count: 'total' }],
    } },
  ]).option({ maxTimeMS: 8000 });
  const items = await Content.populate(result?.items || [], [
    { path: 'authorId', select: 'username displayName' },
    { path: 'primaryAreaId', select: 'name slug' },
    { path: 'primaryCategoryId', select: 'name slug' },
    { path: 'thumbnailMediaId', select: 'url secureUrl altText width height resourceType' },
  ]);
  return { items, total: Number(result?.count?.[0]?.total || 0) };
}
