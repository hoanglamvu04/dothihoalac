import * as s from './reaction.service.js';
import { sendSuccess } from '../../utils/apiResponse.js';
export async function put(req, res) {
  return sendSuccess(res, {
    data: await s.put(
      req.user._id,
      req.params.targetType,
      req.params.targetId,
      req.body.reactionType,
    ),
    message: 'Đã cập nhật cảm xúc.',
  });
}
export async function remove(req, res) {
  return sendSuccess(res, {
    data: await s.remove(req.user._id, req.params.targetType, req.params.targetId),
    message: 'Đã bỏ cảm xúc.',
  });
}
