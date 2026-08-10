import { Router } from 'express';

import { PERMISSIONS } from '../../constants/permissions.js';
import { requireAuth } from '../../middlewares/auth.middleware.js';
import { requirePermission } from '../../middlewares/role.middleware.js';
import asyncHandler from '../../utils/asyncHandler.js';
import * as controller from './newsroom.controller.js';

const router = Router();

router.use(
  requireAuth,
  requirePermission(
    PERMISSIONS.CREATE_ARTICLE,
    PERMISSIONS.EDIT_ARTICLE,
    PERMISSIONS.APPROVE_ARTICLE,
    PERMISSIONS.MANAGE_SYSTEM,
  ),
);

router.get('/overview', asyncHandler(controller.overview));
router.get('/stories', asyncHandler(controller.listStories));
router.get('/stories/:id', asyncHandler(controller.storyDetail));
router.post('/scout', asyncHandler(controller.triggerScout));
router.post('/stories/:id/run', asyncHandler(controller.runStory));

export default router;
