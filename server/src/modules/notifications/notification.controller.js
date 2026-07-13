import * as s from './notification.service.js';
import { sendSuccess } from '../../utils/apiResponse.js';
export async function list(req, res) {
  const r = await s.list(req.user._id, req.query);
  return sendSuccess(res, { data: r.items, meta: r.meta });
}
export async function count(req, res) {
  return sendSuccess(res, { data: { count: await s.unreadCount(req.user._id) } });
}
export async function read(req, res) {
  return sendSuccess(res, { data: await s.readOne(req.user._id, req.params.id) });
}
export async function readAll(req, res) {
  return sendSuccess(res, { data: await s.readAll(req.user._id) });
}
export async function remove(req, res) {
  return sendSuccess(res, { data: await s.remove(req.user._id, req.params.id) });
}
export async function prefs(req, res) {
  return sendSuccess(res, { data: await s.getPreferences(req.user._id) });
}
export async function updatePrefs(req, res) {
  return sendSuccess(res, {
    data: await s.updatePreferences(req.user._id, req.body.preferences),
    message: 'Đã cập nhật cài đặt thông báo.',
  });
}
