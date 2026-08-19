import * as s from './community.service.js';
import { listCompactCommunity } from './community.compactList.service.js';
import Reaction from '../reactions/reaction.model.js';
import {
  sendCreated,
  sendSuccess,
} from '../../utils/apiResponse.js';

function wantsCompact(value) {
  return ['1', 'true', 'yes'].includes(String(value || '').trim().toLowerCase());
}

export async function list(req, res) {
  const compact = wantsCompact(req.query.compact);
  const result = compact
    ? await listCompactCommunity(req.query)
    : await s.list(
        req.query,
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
