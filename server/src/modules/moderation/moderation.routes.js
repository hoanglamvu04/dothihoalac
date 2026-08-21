import { Router } from 'express';
import * as c from './moderation.controller.js';
import * as leadController from '../leads/lead.controller.js';
import { requireAuth } from '../../middlewares/auth.middleware.js';
import { requirePermission, requireRole } from '../../middlewares/role.middleware.js';
import { ADMIN_ROLES } from '../../constants/roles.js';
import { PERMISSIONS } from '../../constants/permissions.js';
import asyncHandler from '../../utils/asyncHandler.js';

const r = Router();
const contentModerationPermissions = [
  PERMISSIONS.APPROVE_ARTICLE,
  PERMISSIONS.PUBLISH_ARTICLE,
  PERMISSIONS.MODERATE_COMMUNITY,
  PERMISSIONS.MODERATE_PROPERTY,
  PERMISSIONS.MODERATE_JOB,
  PERMISSIONS.MODERATE_COMMENT,
];
const reportPermissions = [
  PERMISSIONS.MANAGE_USERS,
  PERMISSIONS.MODERATE_COMMUNITY,
  PERMISSIONS.MODERATE_PROPERTY,
  PERMISSIONS.MODERATE_JOB,
  PERMISSIONS.MODERATE_COMMENT,
];

r.use(requireAuth);
r.get('/dashboard', requireRole(...ADMIN_ROLES), asyncHandler(c.dashboard));
r.get(
  '/moderation/queue',
  requirePermission(...contentModerationPermissions),
  asyncHandler(c.queue),
);
r.post(
  '/contents/:id/approve',
  requirePermission(...contentModerationPermissions),
  asyncHandler(c.approve),
);
r.post(
  '/contents/:id/request-revision',
  requirePermission(...contentModerationPermissions),
  asyncHandler(c.requestRevision),
);
r.post(
  '/contents/:id/reject',
  requirePermission(...contentModerationPermissions),
  asyncHandler(c.reject),
);
r.post(
  '/contents/:id/hide',
  requirePermission(...contentModerationPermissions),
  asyncHandler(c.hide),
);
r.post(
  '/contents/:id/restore',
  requirePermission(...contentModerationPermissions),
  asyncHandler(c.restore),
);
r.get('/users', requirePermission(PERMISSIONS.MANAGE_USERS), asyncHandler(c.users));
r.patch(
  '/users/:id/status',
  requirePermission(PERMISSIONS.MANAGE_USERS),
  asyncHandler(c.userStatus),
);
r.patch(
  '/users/:id/password',
  requirePermission(PERMISSIONS.MANAGE_USERS),
  asyncHandler(c.userPassword),
);
r.get('/reports', requirePermission(...reportPermissions), asyncHandler(c.reports));
r.patch('/reports/:id', requirePermission(...reportPermissions), asyncHandler(c.report));
r.get('/leads', requirePermission(PERMISSIONS.MANAGE_LEADS), asyncHandler(leadController.adminList));
r.get('/leads/:id', requirePermission(PERMISSIONS.MANAGE_LEADS), asyncHandler(leadController.detail));
r.patch(
  '/leads/:id',
  requirePermission(PERMISSIONS.MANAGE_LEADS),
  asyncHandler(leadController.adminUpdate),
);

export default r;
