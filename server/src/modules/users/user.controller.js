import * as service from './user.service.js';
import { sendSuccess } from '../../utils/apiResponse.js';
export async function publicProfile(req, res) {
  return sendSuccess(res, { data: await service.getPublicProfile(req.params.username) });
}
export async function myProfile(req, res) {
  return sendSuccess(res, { data: await service.getPrivateProfile(req.user._id) });
}
export async function updateMyProfile(req, res) {
  return sendSuccess(res, {
    data: await service.updateProfile(req.user, req.body),
    message: 'Đã cập nhật hồ sơ.',
  });
}
export async function updateUsername(req, res) {
  return sendSuccess(res, {
    data: await service.changeUsername(req.user, req.body.username),
    message: 'Đã đổi tên người dùng.',
  });
}
export async function sessions(req, res) {
  return sendSuccess(res, { data: await service.listSessions(req.user._id) });
}
export async function revokeSession(req, res) {
  await service.revokeSession(req.user._id, req.params.id);
  return sendSuccess(res, { message: 'Đã thu hồi phiên đăng nhập.' });
}
export async function myPosts(req, res) {
  const r = await service.listMyPosts(req.user._id, req.query);
  return sendSuccess(res, { data: r.items, meta: r.meta });
}
export async function myListings(req, res) {
  const r = await service.listMyListings(req.user._id, req.query);
  return sendSuccess(res, { data: r.items, meta: r.meta });
}
export async function myBookmarks(req, res) {
  const r = await service.listMyBookmarks(req.user._id, req.query);
  return sendSuccess(res, { data: r.items, meta: r.meta });
}
export async function myReports(req, res) {
  const r = await service.listMyReports(req.user._id, req.query);
  return sendSuccess(res, { data: r.items, meta: r.meta });
}
