import * as s from './lead.service.js';
import { sendCreated, sendSuccess } from '../../utils/apiResponse.js';
export async function create(req, res) {
  return sendCreated(res, await s.create(req.user?._id ?? null, req.body), 'Đã tiếp nhận yêu cầu.');
}
export async function referral(req, res) {
  return sendCreated(
    res,
    await s.referral(req.user?._id ?? null, req.body),
    'Đã ghi nhận lượt chuyển.',
  );
}
export async function adminList(req, res) {
  const r = await s.adminList(req.query);
  return sendSuccess(res, { data: r.items, meta: r.meta });
}
export async function adminUpdate(req, res) {
  return sendSuccess(res, {
    data: await s.adminUpdate(req.params.id, req.user._id, req.body),
    message: 'Đã cập nhật lead.',
  });
}
export async function detail(req, res) {
  return sendSuccess(res, { data: await s.detail(req.params.id) });
}
