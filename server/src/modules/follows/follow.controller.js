import * as s from './follow.service.js';
import { sendSuccess } from '../../utils/apiResponse.js';
export async function put(req, res) {
  return sendSuccess(res, {
    data: await s.put(req.user._id, req.params.targetType, req.params.targetId),
    message: 'Đã theo dõi.',
  });
}
export async function remove(req, res) {
  return sendSuccess(res, {
    data: await s.remove(req.user._id, req.params.targetType, req.params.targetId),
    message: 'Đã bỏ theo dõi.',
  });
}
export async function list(req, res) {
  return sendSuccess(res, { data: await s.list(req.user._id) });
}
