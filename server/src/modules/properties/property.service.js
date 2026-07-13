import Content from '../contents/content.model.js';
import PropertyListing from './propertyListing.model.js';
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
import { parsePagination, buildPaginationMeta } from '../../utils/pagination.js';
import ApiError from '../../utils/ApiError.js';
export async function list(q) {
  const { page, limit, skip } = parsePagination(q);
  const pf = {};
  for (const k of ['transactionType', 'propertyType', 'ownerType', 'legalStatus'])
    if (q[k]) pf[k] = q[k];
  if (q.minPrice || q.maxPrice)
    pf.price = {
      ...(q.minPrice ? { $gte: Number(q.minPrice) } : {}),
      ...(q.maxPrice ? { $lte: Number(q.maxPrice) } : {}),
    };
  if (q.minArea || q.maxArea)
    pf.landArea = {
      ...(q.minArea ? { $gte: Number(q.minArea) } : {}),
      ...(q.maxArea ? { $lte: Number(q.maxArea) } : {}),
    };
  let ids = (await PropertyListing.find(pf).select('contentId').lean()).map((x) => x.contentId);
  const f = { _id: { $in: ids }, contentType: 'property', status: 'published', deletedAt: null };
  if (q.area) f.primaryAreaId = q.area;
  const sort =
    q.sort === 'price_asc'
      ? { createdAt: -1 }
      : q.sort === 'price_desc'
        ? { createdAt: -1 }
        : { publishedAt: -1 };
  const [items, total] = await Promise.all([
    Content.find(f)
      .populate('primaryAreaId', 'name slug')
      .populate('thumbnailMediaId', 'publicUrl altText')
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(),
    Content.countDocuments(f),
  ]);
  const details = await PropertyListing.find({
    contentId: { $in: items.map((i) => i._id) },
  }).lean();
  const map = new Map(details.map((d) => [String(d.contentId), d]));
  return {
    items: items.map((i) => ({ ...i, property: map.get(String(i._id)) })),
    meta: buildPaginationMeta({ page, limit, total }),
  };
}
export async function detail(slug) {
  const base = await getPublishedContentBySlug(slug, 'property');
  const property = await PropertyListing.findOne({ contentId: base._id })
    .populate('featureIds')
    .lean();
  return { ...base, property };
}
export async function create(user, d) {
  if (!user.phoneVerifiedAt)
    throw new ApiError(
      403,
      'Bạn phải xác thực số điện thoại trước khi đăng tin.',
      'PHONE_VERIFICATION_REQUIRED',
    );
  if (normalizePhone(d.contactPhone) !== user.phone) {
    throw new ApiError(
      422,
      'Số liên hệ phải là số điện thoại đã xác thực của tài khoản.',
      'CONTACT_PHONE_NOT_VERIFIED',
    );
  }
  if (!d.isNegotiable && d.price <= 0)
    throw new ApiError(422, 'Giá phải lớn hơn 0 hoặc chọn giá thỏa thuận.', 'PRICE_INVALID');
  const c = await createContentWithBody({
    authorId: user._id,
    contentType: 'property',
    ...d,
    status: 'draft',
  });
  const location =
    d.longitude !== undefined && d.latitude !== undefined
      ? { type: 'Point', coordinates: [d.longitude, d.latitude] }
      : undefined;
  await PropertyListing.create({
    contentId: c._id,
    ...d,
    contactPhone: normalizePhone(d.contactPhone),
    location,
    expiresAt: new Date(Date.now() + env.PROPERTY_DEFAULT_EXPIRE_DAYS * 86400000),
  });
  return c;
}
export async function update(id, userId, d) {
  const c = await getOwnedContentOrThrow(id, userId, 'property');
  assertEditable(c);
  const p = await PropertyListing.findOne({ contentId: id });
  if (!p) throw new ApiError(404, 'Không tìm thấy dữ liệu BĐS.', 'PROPERTY_NOT_FOUND');
  if (d.price !== undefined && d.price !== p.price)
    await PropertyPriceHistory.create({
      contentId: id,
      oldPrice: p.price,
      newPrice: d.price,
      changedBy: userId,
    });
  await updateContentWithBody(c, d, userId, 'Property edit');
  Object.assign(p, d);
  if (d.contactPhone) p.contactPhone = normalizePhone(d.contactPhone);
  if (d.longitude !== undefined && d.latitude !== undefined)
    p.location = { type: 'Point', coordinates: [d.longitude, d.latitude] };
  await p.save();
  return c;
}
export async function submit(id, userId) {
  const c = await getOwnedContentOrThrow(id, userId, 'property');
  if (!['draft', 'needs_revision', 'rejected'].includes(c.status))
    throw new ApiError(409, 'Tin không thể gửi duyệt.', 'INVALID_STATUS');
  c.status = 'pending_review';
  await c.save();
  return c;
}
export async function renew(id, userId) {
  const c = await getOwnedContentOrThrow(id, userId, 'property');
  const p = await PropertyListing.findOne({ contentId: id });
  p.expiresAt = new Date(Date.now() + env.PROPERTY_DEFAULT_EXPIRE_DAYS * 86400000);
  if (c.status === 'expired') c.status = 'pending_review';
  await Promise.all([p.save(), c.save()]);
  return p;
}
async function mark(id, userId, type) {
  const c = await getOwnedContentOrThrow(id, userId, 'property');
  const p = await PropertyListing.findOne({ contentId: id });
  if (type === 'sold') {
    p.soldAt = new Date();
    p.rentedAt = null;
  } else {
    p.rentedAt = new Date();
    p.soldAt = null;
  }
  c.status = 'archived';
  await Promise.all([p.save(), c.save()]);
  return p;
}
export const markSold = (id, u) => mark(id, u, 'sold');
export const markRented = (id, u) => mark(id, u, 'rented');
export async function recordContact(id, userId, type, ip) {
  const exists = await Content.exists({ _id: id, contentType: 'property', status: 'published' });
  if (!exists) throw new ApiError(404, 'Không tìm thấy tin.', 'PROPERTY_NOT_FOUND');
  return PropertyContact.create({ contentId: id, userId, contactType: type, ipAddress: ip });
}
