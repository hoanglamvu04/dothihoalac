import * as s from './media.service.js';
import { sendCreated, sendSuccess } from '../../utils/apiResponse.js';
export async function upload(req, res) {
  return sendCreated(
    res,
    await s.uploadImage(req.user, req.file, req.body.altText),
    'Tải ảnh thành công.',
  );
}
export async function mine(req, res) {
  return sendSuccess(res, { data: await s.listOwn(req.user._id) });
}
export async function remove(req, res) {
  return sendSuccess(res, {
    data: await s.remove(req.user._id, req.params.id),
    message: 'Đã xóa tệp.',
  });
}
