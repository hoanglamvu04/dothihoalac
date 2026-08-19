import * as s from './property.service.js';
import { listPublicProperties } from './property.publicList.service.js';
import { sendCreated, sendSuccess } from '../../utils/apiResponse.js';

export async function list(req, res) {
  const r = await listPublicProperties(req.query);
  return sendSuccess(res, { data: r.items, meta: r.meta });
}

export async function detail(req, res) {
  return sendSuccess(res, { data: await s.detail(req.params.slug) });
}

export async function editor(req, res) {
  return sendSuccess(res, {
    data: await s.editorDetail(req.params.id, req.user._id),
  });
}

export async function create(req, res) {
  return sendCreated(res, await s.create(req.user, req.body), 'Đã tạo tin nháp.');
}

export async function update(req, res) {
  return sendSuccess(res, {
    data: await s.update(req.params.id, req.user._id, req.body),
    message: 'Đã cập nhật tin.',
  });
}

export async function submit(req, res) {
  return sendSuccess(res, {
    data: await s.submit(req.params.id, req.user._id),
    message: 'Đã gửi tin đi duyệt.',
  });
}

export async function renew(req, res) {
  return sendSuccess(res, {
    data: await s.renew(req.params.id, req.user._id),
    message: 'Đã gia hạn tin.',
  });
}

export async function sold(req, res) {
  return sendSuccess(res, {
    data: await s.markSold(req.params.id, req.user._id),
    message: 'Đã đánh dấu đã bán.',
  });
}

export async function rented(req, res) {
  return sendSuccess(res, {
    data: await s.markRented(req.params.id, req.user._id),
    message: 'Đã đánh dấu đã cho thuê.',
  });
}

export async function contact(req, res) {
  return sendCreated(
    res,
    await s.recordContact(req.params.id, req.user?._id, req.body.contactType, req.ip),
    'Đã ghi nhận tương tác.',
  );
}
