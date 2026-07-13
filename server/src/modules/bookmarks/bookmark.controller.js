import * as s from './bookmark.service.js';
import { sendSuccess } from '../../utils/apiResponse.js';
export async function put(req, res) {
  return sendSuccess(res, {
    data: await s.put(req.user._id, req.params.contentId),
    message: 'Đã lưu nội dung.',
  });
}
export async function remove(req, res) {
  return sendSuccess(res, {
    data: await s.remove(req.user._id, req.params.contentId),
    message: 'Đã bỏ lưu.',
  });
}
