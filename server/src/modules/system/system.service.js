import SystemSetting from './systemSetting.model.js';
import StaticPage from './staticPage.model.js';
import Banner from './banner.model.js';
import AdminActivityLog from './adminActivityLog.model.js';
import { createUniqueSlug } from '../../services/slug.service.js';
import { cleanHtml } from '../../utils/sanitizeHtml.js';
import { parsePagination, buildPaginationMeta } from '../../utils/pagination.js';
import ApiError from '../../utils/ApiError.js';

function text(value = '') {
  return String(value ?? '').trim();
}

function dateOrNull(value, fieldName) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new ApiError(422, `${fieldName} không hợp lệ.`, 'INVALID_AD_DATE');
  }
  return date;
}

function normalizeAdPayload(data = {}) {
  const imageMediaId = data.imageMediaId?._id || data.imageMediaId || null;
  const slotKey = text(data.slotKey || data.position);
  const creativeType = ['image', 'text', 'image_text'].includes(data.creativeType)
    ? data.creativeType
    : imageMediaId
      ? 'image'
      : 'text';

  const payload = {
    title: text(data.title),
    headline: text(data.headline),
    description: text(data.description),
    ctaLabel: text(data.ctaLabel),
    creativeType,
    imageMediaId,
    targetUrl: text(data.targetUrl),
    slotKey,
    device: ['all', 'desktop', 'mobile'].includes(data.device)
      ? data.device
      : 'all',
    startAt: dateOrNull(data.startAt, 'Thời gian bắt đầu'),
    endAt: dateOrNull(data.endAt, 'Thời gian kết thúc'),
    isActive: data.isActive !== false,
    displayOrder: Number.isFinite(Number(data.displayOrder))
      ? Number(data.displayOrder)
      : 0,
    priority: Number.isFinite(Number(data.priority))
      ? Number(data.priority)
      : 0,
  };

  if (!payload.title) {
    throw new ApiError(422, 'Tên chiến dịch quảng cáo không được để trống.', 'AD_TITLE_REQUIRED');
  }

  if (!payload.slotKey) {
    throw new ApiError(422, 'Bạn chưa chọn vị trí hiển thị quảng cáo.', 'AD_SLOT_REQUIRED');
  }

  const hasTextCreative = Boolean(payload.headline || payload.description);

  if (payload.creativeType === 'image' && !payload.imageMediaId) {
    throw new ApiError(422, 'Quảng cáo dạng ảnh cần có ảnh.', 'AD_IMAGE_REQUIRED');
  }

  if (payload.creativeType === 'text' && !hasTextCreative) {
    throw new ApiError(422, 'Quảng cáo dạng chữ cần có tiêu đề hoặc mô tả.', 'AD_TEXT_REQUIRED');
  }

  if (
    payload.creativeType === 'image_text' &&
    (!payload.imageMediaId || !hasTextCreative)
  ) {
    throw new ApiError(
      422,
      'Quảng cáo ảnh + chữ cần có cả ảnh và nội dung chữ.',
      'AD_CREATIVE_REQUIRED',
    );
  }

  if (payload.startAt && payload.endAt && payload.startAt > payload.endAt) {
    throw new ApiError(
      422,
      'Thời gian kết thúc phải sau thời gian bắt đầu.',
      'INVALID_AD_SCHEDULE',
    );
  }

  return payload;
}

export async function page(slug) {
  const p = await StaticPage.findOne({ slug, status: 'published' }).lean();
  if (!p) throw new ApiError(404, 'Không tìm thấy trang.', 'PAGE_NOT_FOUND');
  return p;
}

export async function banners(query = {}) {
  const now = new Date();
  const slotKey = text(query.slotKey || query.position);
  const device = ['desktop', 'mobile'].includes(query.device)
    ? query.device
    : null;
  const limit = Math.min(10, Math.max(1, Number(query.limit) || 4));

  const filter = {
    deletedAt: null,
    isActive: true,
    $and: [
      { $or: [{ startAt: null }, { startAt: { $lte: now } }] },
      { $or: [{ endAt: null }, { endAt: { $gte: now } }] },
    ],
  };

  if (slotKey) {
    filter.$or = [
      { slotKey },
      { slotKey: '', position: slotKey },
    ];
  }

  if (device) {
    filter.device = { $in: ['all', device] };
  }

  return Banner.find(filter)
    .populate('imageMediaId', 'url secureUrl altText width height')
    .sort({ priority: -1, displayOrder: 1, updatedAt: -1 })
    .limit(limit)
    .lean();
}

export async function trackBannerMetric(id, metric) {
  const field = metric === 'click' ? 'clickCount' : 'impressionCount';
  const item = await Banner.findOneAndUpdate(
    { _id: id, deletedAt: null },
    { $inc: { [field]: 1 } },
    { new: true, projection: { _id: 1, impressionCount: 1, clickCount: 1 } },
  ).lean();

  if (!item) {
    throw new ApiError(404, 'Không tìm thấy quảng cáo.', 'BANNER_NOT_FOUND');
  }

  return item;
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
    if (d.title && !d.slug) {
      p.slug = await createUniqueSlug(StaticPage, d.title, { excludeId: p._id });
    }
  }

  p.body = cleanHtml(p.body);
  await p.save();
  return p;
}

export async function listBanners(query = {}) {
  const filter = { deletedAt: null };
  const q = text(query.q);
  const slotKey = text(query.slotKey);

  if (slotKey) filter.slotKey = slotKey;
  if (query.isActive === 'true') filter.isActive = true;
  if (query.isActive === 'false') filter.isActive = false;

  if (q) {
    const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escaped, 'i');
    filter.$or = [
      { title: regex },
      { headline: regex },
      { description: regex },
      { slotKey: regex },
    ];
  }

  return Banner.find(filter)
    .populate('imageMediaId', 'url secureUrl altText width height')
    .populate('createdBy', 'username displayName')
    .populate('updatedBy', 'username displayName')
    .sort({ updatedAt: -1 })
    .lean();
}

export async function saveBanner(userId, data, id) {
  const payload = normalizeAdPayload(data);

  if (id) {
    const item = await Banner.findOne({ _id: id, deletedAt: null });
    if (!item) throw new ApiError(404, 'Không tìm thấy quảng cáo.', 'BANNER_NOT_FOUND');

    Object.assign(item, payload, { updatedBy: userId });
    await item.save();
    await item.populate('imageMediaId', 'url secureUrl altText width height');
    return item;
  }

  const item = await Banner.create({
    ...payload,
    createdBy: userId,
    updatedBy: userId,
  });
  await item.populate('imageMediaId', 'url secureUrl altText width height');
  return item;
}

export async function toggleBanner(userId, id, isActive) {
  const item = await Banner.findOneAndUpdate(
    { _id: id, deletedAt: null },
    { $set: { isActive: Boolean(isActive), updatedBy: userId } },
    { new: true, runValidators: true },
  ).populate('imageMediaId', 'url secureUrl altText width height');

  if (!item) throw new ApiError(404, 'Không tìm thấy quảng cáo.', 'BANNER_NOT_FOUND');
  return item;
}

export async function deleteBanner(userId, id) {
  const item = await Banner.findOneAndUpdate(
    { _id: id, deletedAt: null },
    {
      $set: {
        isActive: false,
        deletedAt: new Date(),
        updatedBy: userId,
      },
    },
    { new: true },
  );

  if (!item) throw new ApiError(404, 'Không tìm thấy quảng cáo.', 'BANNER_NOT_FOUND');
  return item;
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
