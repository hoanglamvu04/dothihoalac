import { Router } from 'express';
import * as controller from './role.admin.controller.js';
import { requireAuth } from '../../middlewares/auth.middleware.js';
import { requireRole } from '../../middlewares/role.middleware.js';
import { ROLES } from '../../constants/roles.js';
import asyncHandler from '../../utils/asyncHandler.js';

const router = Router();

router.use(requireAuth, requireRole(ROLES.SYSTEM_ADMIN));
router.get('/', asyncHandler(controller.overview));
router.patch('/users/:id/roles', asyncHandler(controller.updateUserRoles));

export default router;
