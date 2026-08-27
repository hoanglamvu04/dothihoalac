import mongoose from 'mongoose';

import * as s from './community.service.js';
import { listCompactCommunity } from './community.compactList.service.js';
import Reaction from '../reactions/reaction.model.js';
import Category from '../taxonomy/category.model.js';
import Area from '../taxonomy/area.model.js';
import {
  sendCreated,
  sendSuccess,
} from '../../utils/apiResponse.js';

const EMPTY_TAXONOMY_ID = '000000000000000000000000';

function wantsCompact(value) {
  return ['1', 'true', 'yes'].includes(String(value || '').trim().toLowerCase());
}

async function resolveTaxonomyFilter(
  Model,
  value,
  extraFilter = {},
) {
  const normalized = String(value || '').trim();

  if (!normalized) {
    return '';
  }

  // Giữ tương thích với URL/API cũ còn truyền Mongo ObjectId.
  if (mongoose.isValidObjectId(normalized)) {
    return normalized;
  }

  const item = await Model.findOne({
    slug: normalized.toLowerCase(),
    isActive: true,
    ...extraFilter,
  })
    .select('_id')
    .lean();

  // Trả về một ObjectId hợp lệ nhưng không tồn tại để query slug sai
  // cho kết quả rỗng thay vì vô tình bỏ bộ lọc.
  return item?._id
    ? String(item._id)
    : EMPTY_TAXONOMY_ID;
}

async function normalizeListQuery(query = {}) {
  const next = { ...query };

  const [area, category] = await Promise.all([
    query.area
      ? resolveTaxonomyFilter(Area, query.area)
      : '',
    query.category
      ? resolveTaxonomyFilter(Category, query.category, {
          contentScope: { $in: ['community', 'all'] },
        })
      : '',
  ]);

  if (query.area) {
    next.area = area;
  }

  if (query.category) {
    next.category = category;
  }

  return next;
}

export async function list(req, res) {
  const compact = wantsCompact(req.query.compact);
  const baseQuery = req.query.limit
    ? req.query
    : { ...req.query, limit: 10 };
  const query = await normalizeListQuery(baseQuery);

  const result = compact
    ? await listCompactCommunity(query)
    : await s.list(
        query,
        req.user?._id || null,
      );

  // Defense in depth cho dữ liệu cũ từng được publish với visibility khác public.
  const items = (result.items || []).filter(
    (item) => item?.visibility === 'public',
  );

  return sendSuccess(res, {
    data: items,
    meta: result.meta,
  });
}

export async function detail(req, res) {
  const data = await s.detail(req.params.slug);

  let viewerReaction = null;

  if (req.user?._id && data?._id) {
    const reaction = await Reaction.findOne({
      userId: req.user._id,
      targetType: 'content',
      targetId: data._id,
    })
      .select('reactionType')
      .lean();

    viewerReaction = reaction?.reactionType || null;
  }

  return sendSuccess(res, {
    data: {
      ...data,
      viewerReaction,
    },
  });
}

export async function editor(req, res) {
  return sendSuccess(res, {
    data: await s.editorDetail(
      req.params.id,
      req.user._id,
    ),
  });
}

export async function create(req, res) {
  return sendCreated(
    res,
    await s.create(req.user._id, req.body),
    'Đã tạo bản nháp.',
  );
}

export async function update(req, res) {
  return sendSuccess(res, {
    data: await s.update(
      req.params.id,
      req.user._id,
      req.body,
    ),
    message: 'Đã cập nhật bài.',
  });
}

export async function remove(req, res) {
  await s.remove(req.params.id, req.user._id);

  return sendSuccess(res, {
    message: 'Đã xóa bài.',
  });
}

export async function submit(req, res) {
  return sendSuccess(res, {
    data: await s.submit(
      req.params.id,
      req.user._id,
      req.body,
    ),
    message: 'Đã gửi bài đi duyệt.',
  });
}

export async function accept(req, res) {
  return sendSuccess(res, {
    data: await s.acceptAnswer(
      req.params.id,
      req.user._id,
      req.body.commentId,
    ),
    message: 'Đã chọn câu trả lời.',
  });
}
