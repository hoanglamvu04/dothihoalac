import * as s from './system.service.js';
import { sendCreated, sendSuccess } from '../../utils/apiResponse.js';
export async function page(req, res) {
  return sendSuccess(res, { data: await s.page(req.params.slug) });
}
export async function banners(req, res) {
  return sendSuccess(res, { data: await s.banners(req.query.position) });
}
export async function settings(req, res) {
  return sendSuccess(res, { data: await s.settings() });
}
export async function updateSetting(req, res) {
  return sendSuccess(res, {
    data: await s.setSetting(req.user._id, req.params.key, req.body.value, req.body.valueType),
    message: 'Đã lưu cấu hình.',
  });
}
export async function pages(req, res) {
  return sendSuccess(res, { data: await s.listPages() });
}
export async function savePage(req, res) {
  return req.params.id
    ? sendSuccess(res, { data: await s.savePage(req.user._id, req.body, req.params.id) })
    : sendCreated(res, await s.savePage(req.user._id, req.body));
}
export async function adminBanners(req, res) {
  return sendSuccess(res, { data: await s.listBanners() });
}
export async function saveBanner(req, res) {
  return req.params.id
    ? sendSuccess(res, { data: await s.saveBanner(req.body, req.params.id) })
    : sendCreated(res, await s.saveBanner(req.body));
}
export async function logs(req, res) {
  const r = await s.auditLogs(req.query);
  return sendSuccess(res, { data: r.items, meta: r.meta });
}
