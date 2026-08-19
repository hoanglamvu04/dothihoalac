import * as s from './moderation.service.js';
import { sendSuccess } from '../../utils/apiResponse.js';

export async function dashboard(req, res) {
  return sendSuccess(res, { data: await s.dashboard() });
}

export async function queue(req, res) {
  const r = await s.queue(req.query);
  return sendSuccess(res, { data: r.items, meta: r.meta });
}

function act(type) {
  return async (req, res) =>
    sendSuccess(res, {
      data: await s.action(
        req.user,
        req.auth,
        req.params.id,
        type,
        req.body,
        req.ip,
      ),
      message: 'Đã xử lý nội dung.',
    });
}

export const approve = act('approve'),
  requestRevision = act('request_revision'),
  reject = act('reject'),
  hide = act('hide'),
  restore = act('restore');

export async function users(req, res) {
  const r = await s.users(req.query);
  return sendSuccess(res, { data: r.items, meta: r.meta });
}

export async function userStatus(req, res) {
  return sendSuccess(res, {
    data: await s.updateUserStatus(req.user, req.params.id, req.body, req.ip),
    message: 'Đã cập nhật tài khoản.',
  });
}

export async function reports(req, res) {
  const r = await s.reports(req.query);
  return sendSuccess(res, { data: r.items, meta: r.meta });
}

export async function report(req, res) {
  return sendSuccess(res, {
    data: await s.resolveReport(req.user, req.params.id, req.body),
    message: 'Đã xử lý báo cáo.',
  });
}
