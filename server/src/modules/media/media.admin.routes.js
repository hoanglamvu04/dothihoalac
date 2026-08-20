import { Router } from 'express';
import { requireAuth } from '../../middlewares/auth.middleware.js';
import { requirePermission } from '../../middlewares/role.middleware.js';
import { PERMISSIONS } from '../../constants/permissions.js';
import asyncHandler from '../../utils/asyncHandler.js';
import * as controller from './media.admin.controller.js';

const router = Router();

router.use(requireAuth, requirePermission(PERMISSIONS.MANAGE_MEDIA, PERMISSIONS.MANAGE_SYSTEM));

router.get('/', asyncHandler(controller.list));
router.get('/stats', asyncHandler(controller.stats));
router.get('/:id/usage', asyncHandler(controller.usage));
router.patch('/:id/alt', asyncHandler(controller.updateAlt));

export default router;
