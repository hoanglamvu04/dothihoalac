import { Router } from 'express';
import * as controller from './adminContent.controller.js';
import { requireAuth } from '../../middlewares/auth.middleware.js';
import { requireRole } from '../../middlewares/role.middleware.js';
import { ADMIN_ROLES } from '../../constants/roles.js';
import asyncHandler from '../../utils/asyncHandler.js';

const router = Router();
router.use(requireAuth, requireRole(...ADMIN_ROLES));

router.get('/comments', asyncHandler(controller.comments));
router.patch('/comments/:id', asyncHandler(controller.updateComment));
router.delete('/comments/:id', asyncHandler(controller.deleteComment));

router.get('/contents/:type', asyncHandler(controller.list));
router.get('/contents/:type/:id', asyncHandler(controller.detail));
router.patch('/contents/:type/:id', asyncHandler(controller.update));
router.patch('/contents/:type/:id/status', asyncHandler(controller.setStatus));
router.delete('/contents/:type/:id', asyncHandler(controller.remove));

export default router;
