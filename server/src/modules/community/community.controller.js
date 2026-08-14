import * as s from './community.service.js';
import {
  sendCreated,
  sendSuccess,
} from '../../utils/apiResponse.js';

export async function list(req, res) {
  const result = await s.list(
    req.query,
    req.user?._id || null,
  );

  return sendSuccess(res, {
    data: result.items,
    meta: result.meta,
  });
}

export async function detail(req, res) {
  return sendSuccess(res, {
    data: await s.detail(req.params.slug),
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
