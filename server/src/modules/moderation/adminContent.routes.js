import { Router } from 'express';
import * as controller from './adminContent.controller.js';
import { requireAuth } from '../../middlewares/auth.middleware.js';
import { requirePermission } from '../../middlewares/role.middleware.js';
import { PERMISSIONS } from '../../constants/permissions.js';
import ApiError from '../../utils/ApiError.js';
import asyncHandler from '../../utils/asyncHandler.js';

const router = Router();
const permissionByType = {
  community: PERMISSIONS.MODERATE_COMMUNITY,
  property: PERMISSIONS.MODERATE_PROPERTY,
  job: PERMISSIONS.MODERATE_JOB,
};

function requireManagedContentPermission(req, res, next) {
  const permission = permissionByType[req.params.type];
  if (!permission) {
    return next(
      new ApiError(422, 'Loại nội dung quản trị không hợp lệ.', 'ADMIN_CONTENT_TYPE_INVALID'),
    );
  }
  return requirePermission(permission)(req, res, next);
}

router.use(requireAuth);

router.get(
  '/comments',
  requirePermission(PERMISSIONS.MODERATE_COMMENT),
  asyncHandler(controller.comments),
);
router.patch(
  '/comments/:id',
  requirePermission(PERMISSIONS.MODERATE_COMMENT),
  asyncHandler(controller.updateComment),
);
router.delete(
  '/comments/:id',
  requirePermission(PERMISSIONS.MODERATE_COMMENT),
  asyncHandler(controller.deleteComment),
);

router.get('/contents/:type', requireManagedContentPermission, asyncHandler(controller.list));
router.get(
  '/contents/:type/:id',
  requireManagedContentPermission,
  asyncHandler(controller.detail),
);
router.patch(
  '/contents/:type/:id',
  requireManagedContentPermission,
  asyncHandler(controller.update),
);
router.patch(
  '/contents/:type/:id/status',
  requireManagedContentPermission,
  asyncHandler(controller.setStatus),
);
router.delete(
  '/contents/:type/:id',
  requireManagedContentPermission,
  asyncHandler(controller.remove),
);

export default router;
