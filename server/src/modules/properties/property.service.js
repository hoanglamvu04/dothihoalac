import Content from '../contents/content.model.js';

import PropertyListing from './propertyListing.model.js';
import PropertyFeature from './propertyFeature.model.js';
import PropertyPriceHistory from './propertyPriceHistory.model.js';
import PropertyContact from './propertyContact.model.js';

import {
  createContentWithBody,
  getPublishedContentBySlug,
  getOwnedContentOrThrow,
  assertEditable,
  updateContentWithBody,
} from '../contents/content.service.js';

import { env } from '../../config/env.js';
import { normalizePhone } from '../../utils/normalizePhone.js';
import {
  parsePagination,
  buildPaginationMeta,
} from '../../utils/pagination.js';
import ApiError from '../../utils/ApiError.js';

const LISTING_PRIORITY = {
  diamond: 30,
  gold: 20,
  silver: 10,
  standard: 0,
};

const LISTING_DURATIONS = new Set([15, 30, 60]);

function escapeRegex(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function idString(value) {
  return String(value?._id || value || '');
}

function normalizeListingTier(value) {
  return Object.hasOwn(LISTING_PRIORITY, value) ? value : 'standard';
}

function normalizeDuration(value) {
  const number = Number(value);
  return LISTING_DURATIONS.has(number)
    ? number
    : Number(env.PROPERTY_DEFAULT_EXPIRE_DAYS) || 15;
}

function normalizeStartDate(value) {
  const date = value ? new Date(value) : new Date();
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

function getListingDates(data = {}, current = {}) {
  const listingDurationDays = normalizeDuration(
    data.listingDurationDays ?? current.listingDurationDays,
  );

  const listingStartAt = normalizeStartDate(
    data.listingStartAt ?? current.listingStartAt,
  );

  const expiresAt = new Date(
    listingStartAt.getTime() + listingDurationDays * 24 * 60 * 60 * 1000,
  );

  return {
    listingDurationDays,
    listingStartAt,
    expiresAt,
  };
}

/**
 * Lấy danh sách tin bất động sản đã xuất bản.
 * Mặc định ưu tiên hạng tin rồi mới đến thời gian tạo.
 */
export async function list(query) {
  const { page, limit, skip } = parsePagination(query);

  const propertyFilter = {};

  for (const key of [
    'transactionType',
    'propertyType',
    'ownerType',
    'legalStatus',
  ]) {
    if (query[key]) {
      propertyFilter[key] = query[key];
    }
  }

  if (query.minPrice || query.maxPrice) {
    propertyFilter.price = {
      ...(query.minPrice ? { $gte: Number(query.minPrice) } : {}),
      ...(query.maxPrice ? { $lte: Number(query.maxPrice) } : {}),
    };
  }

  if (query.minArea || query.maxArea) {
    propertyFilter.landArea = {
      ...(query.minArea ? { $gte: Number(query.minArea) } : {}),
      ...(query.maxArea ? { $lte: Number(query.maxArea) } : {}),
    };
  }

  let propertySort;

  if (query.sort === 'price_asc') {
    propertySort = { price: 1, listingPriority: -1, createdAt: -1 };
  } else if (query.sort === 'price_desc') {
    propertySort = { price: -1, listingPriority: -1, createdAt: -1 };
  } else if (query.sort === 'oldest') {
    propertySort = { listingPriority: -1, createdAt: 1 };
  } else {
    propertySort = { listingPriority: -1, createdAt: -1 };
  }

  const propertyDetails = await PropertyListing.find(propertyFilter)
    .sort(propertySort)
    .lean();

  const contentIds = propertyDetails.map((item) => item.contentId);

  if (!contentIds.length) {
    return {
      items: [],
      meta: buildPaginationMeta({ page, limit, total: 0 }),
    };
  }

  const contentFilter = {
    _id: { $in: contentIds },
    contentType: 'property',
    status: 'published',
    deletedAt: null,
  };

  if (query.area) {
    contentFilter.primaryAreaId = query.area;
  }

  const queryText = String(query.q || '').trim();

  if (queryText) {
    const regex = new RegExp(escapeRegex(queryText), 'i');
    const addressIds = propertyDetails
      .filter((property) => regex.test(String(property.addressText || '')))
      .map((property) => property.contentId);

    contentFilter.$or = [
      { title: regex },
      { summary: regex },
      ...(addressIds.length ? [{ _id: { $in: addressIds } }] : []),
    ];
  }

  const matching = await Content.find(contentFilter).select('_id').lean();
  const matchingSet = new Set(matching.map((item) => idString(item._id)));
  const orderedIds = contentIds.filter((id) => matchingSet.has(idString(id)));
  const pageIds = orderedIds.slice(skip, skip + limit);
  const total = orderedIds.length;

  const propertyMap = new Map(
    propertyDetails.map((property) => [String(property.contentId), property]),
  );

  let items = [];

  if (pageIds.length) {
    const pageItems = await Content.find({
      _id: { $in: pageIds },
      contentType: 'property',
      status: 'published',
      deletedAt: null,
    })
      .populate('primaryAreaId', 'name slug')
      .populate('thumbnailMediaId', 'url secureUrl altText width height')
      .lean();

    const pageMap = new Map(
      pageItems.map((item) => [String(item._id), item]),
    );

    items = pageIds
      .map((id) => pageMap.get(idString(id)))
      .filter(Boolean);
  }

  return {
    items: items.map((item) => ({
      ...item,
      property: propertyMap.get(String(item._id)) || null,
    })),
    meta: buildPaginationMeta({ page, limit, total }),
  };
}

/**
 * Lấy chi tiết tin bất động sản theo slug.
 */
export async function detail(slug) {
  const base = await getPublishedContentBySlug(slug, 'property');

  const property = await PropertyListing.findOne({ contentId: base._id })
    .populate({
      path: 'featureIds',
      model: PropertyFeature,
      select: 'name slug featureGroup isActive',
    })
    .populate('galleryMediaIds', 'url secureUrl altText width height resourceType')
    .lean();

  if (!property) {
    throw new ApiError(
      404,
      'Không tìm thấy dữ liệu bất động sản.',
      'PROPERTY_NOT_FOUND',
    );
  }

  return {
    ...base,
    property,
  };
}

/**
 * Tạo tin bất động sản mới.
 */
export async function create(user, data) {
  if (!user.phoneVerifiedAt) {
    throw new ApiError(
      403,
      'Bạn phải xác thực số điện thoại trước khi đăng tin.',
      'PHONE_VERIFICATION_REQUIRED',
    );
  }

  const normalizedContactPhone = normalizePhone(data.contactPhone);

  if (normalizedContactPhone !== user.phone) {
    throw new ApiError(
      422,
      'Số liên hệ phải là số điện thoại đã xác thực của tài khoản.',
      'CONTACT_PHONE_NOT_VERIFIED',
    );
  }

  if (!data.isNegotiable && data.price <= 0) {
    throw new ApiError(
      422,
      'Giá phải lớn hơn 0 hoặc chọn giá thỏa thuận.',
      'PRICE_INVALID',
    );
  }

  const content = await createContentWithBody({
    authorId: user._id,
    contentType: 'property',
    ...data,
    status: 'draft',
  });

  const location =
    data.longitude !== undefined && data.latitude !== undefined
      ? {
          type: 'Point',
          coordinates: [data.longitude, data.latitude],
        }
      : undefined;

  const listingTier = normalizeListingTier(data.listingTier);
  const listingDates = getListingDates(data);

  await PropertyListing.create({
    contentId: content._id,
    ...data,
    contactPhone: normalizedContactPhone,
    location,
    listingTier,
    listingPriority: LISTING_PRIORITY[listingTier],
    ...listingDates,
  });

  return content;
}

/**
 * Cập nhật tin bất động sản.
 */
export async function update(id, userId, data) {
  const content = await getOwnedContentOrThrow(id, userId, 'property');
  assertEditable(content);

  const property = await PropertyListing.findOne({ contentId: id });

  if (!property) {
    throw new ApiError(
      404,
      'Không tìm thấy dữ liệu bất động sản.',
      'PROPERTY_NOT_FOUND',
    );
  }

  if (data.price !== undefined && data.price !== property.price) {
    await PropertyPriceHistory.create({
      contentId: id,
      oldPrice: property.price,
      newPrice: data.price,
      changedBy: userId,
    });
  }

  await updateContentWithBody(content, data, userId, 'Property edit');

  Object.assign(property, data);

  if (data.contactPhone) {
    property.contactPhone = normalizePhone(data.contactPhone);
  }

  if (data.longitude !== undefined && data.latitude !== undefined) {
    property.location = {
      type: 'Point',
      coordinates: [data.longitude, data.latitude],
    };
  }

  if (data.listingTier !== undefined) {
    const listingTier = normalizeListingTier(data.listingTier);
    property.listingTier = listingTier;
    property.listingPriority = LISTING_PRIORITY[listingTier];
  }

  if (
    data.listingDurationDays !== undefined ||
    data.listingStartAt !== undefined
  ) {
    const listingDates = getListingDates(data, property);
    property.listingDurationDays = listingDates.listingDurationDays;
    property.listingStartAt = listingDates.listingStartAt;
    property.expiresAt = listingDates.expiresAt;
  }

  await property.save();

  return content;
}

/**
 * Gửi tin đi kiểm duyệt.
 */
export async function submit(id, userId) {
  const content = await getOwnedContentOrThrow(id, userId, 'property');

  const allowedStatuses = ['draft', 'needs_revision', 'rejected'];

  if (!allowedStatuses.includes(content.status)) {
    throw new ApiError(
      409,
      'Tin không thể gửi duyệt.',
      'INVALID_STATUS',
    );
  }

  content.status = 'pending_review';
  await content.save();
  return content;
}

/**
 * Gia hạn tin theo thời hạn người đăng đã chọn.
 */
export async function renew(id, userId) {
  const content = await getOwnedContentOrThrow(id, userId, 'property');

  const property = await PropertyListing.findOne({ contentId: id });

  if (!property) {
    throw new ApiError(
      404,
      'Không tìm thấy dữ liệu bất động sản.',
      'PROPERTY_NOT_FOUND',
    );
  }

  const durationDays = normalizeDuration(property.listingDurationDays);
  property.listingStartAt = new Date();
  property.expiresAt = new Date(
    Date.now() + durationDays * 24 * 60 * 60 * 1000,
  );

  if (content.status === 'expired') {
    content.status = 'pending_review';
  }

  await Promise.all([property.save(), content.save()]);
  return property;
}

/**
 * Đánh dấu tin đã bán hoặc đã cho thuê.
 */
async function mark(id, userId, type) {
  const content = await getOwnedContentOrThrow(id, userId, 'property');

  const property = await PropertyListing.findOne({ contentId: id });

  if (!property) {
    throw new ApiError(
      404,
      'Không tìm thấy dữ liệu bất động sản.',
      'PROPERTY_NOT_FOUND',
    );
  }

  if (type === 'sold') {
    property.soldAt = new Date();
    property.rentedAt = null;
  } else {
    property.rentedAt = new Date();
    property.soldAt = null;
  }

  content.status = 'archived';

  await Promise.all([property.save(), content.save()]);
  return property;
}

export const markSold = (id, userId) => mark(id, userId, 'sold');
export const markRented = (id, userId) => mark(id, userId, 'rented');

/**
 * Ghi nhận hành động liên hệ với tin.
 */
export async function recordContact(id, userId, type, ip) {
  const exists = await Content.exists({
    _id: id,
    contentType: 'property',
    status: 'published',
    deletedAt: null,
  });

  if (!exists) {
    throw new ApiError(404, 'Không tìm thấy tin.', 'PROPERTY_NOT_FOUND');
  }

  return PropertyContact.create({
    contentId: id,
    userId: userId || null,
    contactType: type,
    ipAddress: ip,
  });
}
