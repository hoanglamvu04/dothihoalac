import Media from './media.model.js';
import { getMediaUsage } from './media.service.js';

export async function listAdminMedia(query = {}) {
  const page = Math.max(Number(query.page || 1), 1);
  const limit = Math.min(Math.max(Number(query.limit || 30), 1), 100);
  const filter = { status: { $ne: 'deleted' } };

  if (query.resourceType) filter.resourceType = query.resourceType;
  if (query.status) filter.status = query.status;
  if (query.alt === 'missing') filter.altText = '';

  if (query.q) {
    filter.originalFilename = {
      $regex: String(query.q).trim(),
      $options: 'i',
    };
  }

  const [items, total] = await Promise.all([
    Media.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('ownerId', 'username displayName')
      .lean(),
    Media.countDocuments(filter),
  ]);

  return {
    items,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function mediaStats() {
  const [total, bytes] = await Promise.all([
    Media.countDocuments({ status: 'active' }),
    Media.aggregate([
      { $match: { status: 'active' } },
      { $group: { _id: null, bytes: { $sum: '$fileSize' } } },
    ]),
  ]);

  return {
    total,
    bytes: Number(bytes[0]?.bytes || 0),
  };
}

export async function usage(id) {
  return getMediaUsage(id);
}

export async function updateAlt(id, altText) {
  return Media.findByIdAndUpdate(
    id,
    { $set: { altText: String(altText || '').slice(0, 300) } },
    { new: true },
  ).lean();
}
