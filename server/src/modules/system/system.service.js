import SystemSetting from './systemSetting.model.js';
import StaticPage from './staticPage.model.js';
import Banner from './banner.model.js';
import AdminActivityLog from './adminActivityLog.model.js';
import { createUniqueSlug } from '../../services/slug.service.js';
import { cleanHtml } from '../../utils/sanitizeHtml.js';
import { parsePagination, buildPaginationMeta } from '../../utils/pagination.js';
import ApiError from '../../utils/ApiError.js';
export async function page(slug) {
  const p = await StaticPage.findOne({ slug, status: 'published' }).lean();
  if (!p) throw new ApiError(404, 'Không tìm thấy trang.', 'PAGE_NOT_FOUND');
  return p;
}
export async function banners(position) {
  const now = new Date();
  return Banner.find({
    ...(position ? { position } : {}),
    isActive: true,
    $and: [
      { $or: [{ startAt: null }, { startAt: { $lte: now } }] },
      { $or: [{ endAt: null }, { endAt: { $gte: now } }] },
    ],
  })
    .populate('imageMediaId', 'publicUrl altText')
    .sort({ displayOrder: 1 })
    .lean();
}
export async function settings() {
  return SystemSetting.find().lean();
}
export async function setSetting(userId, key, value, valueType = 'string') {
  return SystemSetting.findOneAndUpdate(
    { settingKey: key },
    { settingValue: value, valueType, updatedBy: userId },
    { upsert: true, new: true },
  );
}
export async function listPages() {
  return StaticPage.find().sort({ updatedAt: -1 }).lean();
}
export async function savePage(userId, d, id) {
  let p = id ? await StaticPage.findById(id) : null;
  if (id && !p) throw new ApiError(404, 'Không tìm thấy trang.', 'PAGE_NOT_FOUND');
  if (!p) {
    const slug = d.slug || (await createUniqueSlug(StaticPage, d.title));
    p = new StaticPage({ ...d, slug, updatedBy: userId });
  } else {
    Object.assign(p, d, { updatedBy: userId });
    if (d.title && !d.slug)
      p.slug = await createUniqueSlug(StaticPage, d.title, { excludeId: p._id });
  }
  p.body = cleanHtml(p.body);
  await p.save();
  return p;
}
export async function listBanners() {
  return Banner.find()
    .populate('imageMediaId', 'publicUrl')
    .sort({ position: 1, displayOrder: 1 })
    .lean();
}
export async function saveBanner(d, id) {
  if (id) {
    const b = await Banner.findByIdAndUpdate(id, d, { new: true, runValidators: true });
    if (!b) throw new ApiError(404, 'Không tìm thấy banner.', 'BANNER_NOT_FOUND');
    return b;
  }
  return Banner.create(d);
}
export async function auditLogs(q) {
  const { page, limit, skip } = parsePagination(q);
  const [items, total] = await Promise.all([
    AdminActivityLog.find()
      .populate('adminId', 'username displayName')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    AdminActivityLog.countDocuments(),
  ]);
  return { items, meta: buildPaginationMeta({ page, limit, total }) };
}
