import * as service from './adminContent.service.js';
import { sendSuccess } from '../../utils/apiResponse.js';

export async function list(req, res) {
  const result = await service.list(req.params.type, req.query);
  return sendSuccess(res, { data: result.items, meta: result.meta });
}

export async function detail(req, res) {
  return sendSuccess(res, {
    data: await service.detail(req.params.type, req.params.id),
  });
}

export async function update(req, res) {
  return sendSuccess(res, {
    data: await service.update(req.user, req.params.type, req.params.id, req.body, req.ip),
    message: 'Đã cập nhật nội dung.',
  });
}

export async function setStatus(req, res) {
  return sendSuccess(res, {
    data: await service.setStatus(
      req.user,
      req.params.type,
      req.params.id,
      req.body.status,
      req.ip,
      req.body.note || '',
    ),
    message: 'Đã cập nhật trạng thái nội dung.',
  });
}

export async function remove(req, res) {
  return sendSuccess(res, {
    data: await service.remove(req.user, req.params.type, req.params.id, req.ip),
    message: 'Đã xóa nội dung.',
  });
}

export async function comments(req, res) {
  const result = await service.comments(req.query);
  return sendSuccess(res, { data: result.items, meta: result.meta });
}

export async function updateComment(req, res) {
  return sendSuccess(res, {
    data: await service.updateComment(req.user, req.params.id, req.body, req.ip),
    message: 'Đã cập nhật bình luận.',
  });
}

export async function deleteComment(req, res) {
  return sendSuccess(res, {
    data: await service.deleteComment(req.user, req.params.id, req.ip),
    message: 'Đã xóa bình luận.',
  });
}
