import * as s from './comment.service.js';
import { sendCreated, sendSuccess } from '../../utils/apiResponse.js';

export async function list(req, res) {
  const result = await s.list(
    req.params.contentId,
    req.query,
    req.user?._id || null,
  );

  return sendSuccess(res, {
    data: result.items,
    meta: result.meta,
  });
}

export async function create(req, res) {
  return sendCreated(
    res,
    await s.create(req.user._id, req.params.contentId, req.body),
    'Đã bình luận.',
  );
}

export async function update(req, res) {
  const isModerator =
    req.auth.permissions.includes('moderate_comment') ||
    req.auth.permissions.includes('manage_system');

  return sendSuccess(res, {
    data: await s.update(
      req.user._id,
      req.params.id,
      req.body.body,
      isModerator,
    ),
    message: 'Đã sửa bình luận.',
  });
}

export async function remove(req, res) {
  const isModerator =
    req.auth.permissions.includes('moderate_comment') ||
    req.auth.permissions.includes('manage_system');

  return sendSuccess(res, {
    data: await s.remove(
      req.user._id,
      req.params.id,
      isModerator,
    ),
    message: 'Đã xóa bình luận.',
  });
}
