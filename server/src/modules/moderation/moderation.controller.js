import * as s from './moderation.service.js';
import * as passwordService from './adminUserPassword.service.js';
import { PERMISSIONS } from '../../constants/permissions.js';
import { sendSuccess } from '../../utils/apiResponse.js';

const CONTENT_QUEUE_PERMISSIONS = [
  PERMISSIONS.APPROVE_ARTICLE,
  PERMISSIONS.PUBLISH_ARTICLE,
  PERMISSIONS.MODERATE_COMMUNITY,
  PERMISSIONS.MODERATE_PROPERTY,
  PERMISSIONS.MODERATE_JOB,
];

const REPORT_PERMISSIONS = [
  PERMISSIONS.MANAGE_USERS,
  PERMISSIONS.MODERATE_COMMUNITY,
  PERMISSIONS.MODERATE_PROPERTY,
  PERMISSIONS.MODERATE_JOB,
  PERMISSIONS.MODERATE_COMMENT,
];

function hasAnyPermission(req, permissions) {
  return permissions.some((permission) => req.auth?.permissions?.includes(permission));
}

export async function dashboard(req, res) {
  const raw = await s.dashboard();
  const data = {
    userCount: hasAnyPermission(req, [PERMISSIONS.MANAGE_USERS]) ? raw.userCount : null,
    pendingContent: hasAnyPermission(req, CONTENT_QUEUE_PERMISSIONS) ? raw.pendingContent : null,
    pendingReports: hasAnyPermission(req, REPORT_PERMISSIONS) ? raw.pendingReports : null,
    newLeads: hasAnyPermission(req, [PERMISSIONS.MANAGE_LEADS]) ? raw.newLeads : null,
    comments: hasAnyPermission(req, [PERMISSIONS.MODERATE_COMMENT]) ? raw.comments : null,
  };
  return sendSuccess(res, { data });
}

export async function queue(req, res) {
  const r = await s.queue(req.query, req.auth);
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
    data: await s.updateUserStatus(
      req.user,
      req.auth,
      req.params.id,
      req.body,
      req.ip,
    ),
    message: 'Đã cập nhật tài khoản.',
  });
}

export async function userPassword(req, res) {
  return sendSuccess(res, {
    data: await passwordService.changePassword(
      req.user,
      req.auth,
      req.params.id,
      req.body.password,
      req.ip,
    ),
    message: 'Đã đổi mật khẩu và thu hồi phiên đăng nhập cũ.',
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
