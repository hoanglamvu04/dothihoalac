import * as service from './project.service.js';
import { sendCreated, sendSuccess } from '../../utils/apiResponse.js';

export async function listPublic(req, res) {
  const result = await service.listPublic(req.query);
  return sendSuccess(res, { data: result.items, meta: result.meta });
}

export async function publicDetail(req, res) {
  return sendSuccess(res, { data: await service.publicDetail(req.params.slug) });
}

export async function adminList(req, res) {
  const result = await service.adminList(req.query);
  return sendSuccess(res, { data: result.items, meta: result.meta });
}

export async function adminDetail(req, res) {
  return sendSuccess(res, { data: await service.adminDetail(req.params.id) });
}

export async function create(req, res) {
  return sendCreated(
    res,
    await service.create(req.user, req.body, req.ip),
    'Đã tạo dự án trong Project Tracker.',
  );
}

export async function update(req, res) {
  return sendSuccess(res, {
    data: await service.update(req.user, req.params.id, req.body, req.ip),
    message: 'Đã cập nhật dự án.',
  });
}

export async function addUpdate(req, res) {
  return sendCreated(
    res,
    await service.addUpdate(req.user, req.params.id, req.body, req.ip),
    'Đã thêm bản cập nhật tiến độ.',
  );
}

export async function deleteUpdate(req, res) {
  return sendSuccess(res, {
    data: await service.deleteUpdate(
      req.user,
      req.params.id,
      req.params.updateId,
      req.ip,
    ),
    message: 'Đã xóa bản cập nhật tiến độ.',
  });
}

export async function remove(req, res) {
  return sendSuccess(res, {
    data: await service.remove(req.user, req.params.id, req.ip),
    message: 'Đã đưa dự án vào trạng thái đã xóa.',
  });
}
