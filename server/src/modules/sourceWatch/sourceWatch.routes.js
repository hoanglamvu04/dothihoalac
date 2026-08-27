import { Router } from 'express';

import { PERMISSIONS } from '../../constants/permissions.js';
import { requireAuth } from '../../middlewares/auth.middleware.js';
import { requirePermission } from '../../middlewares/role.middleware.js';
import asyncHandler from '../../utils/asyncHandler.js';
import * as controller from './sourceWatch.controller.js';

const router = Router();

router.use(
  requireAuth,
  requirePermission(
    PERMISSIONS.CREATE_ARTICLE,
    PERMISSIONS.EDIT_ARTICLE,
    PERMISSIONS.MANAGE_SYSTEM,
  ),
);

router.get('/overview', asyncHandler(controller.overview));
router.get('/sources', asyncHandler(controller.listSources));
router.post('/sources', asyncHandler(controller.createSource));
router.patch('/sources/:id', asyncHandler(controller.updateSource));
router.post('/sources/:id/check', asyncHandler(controller.checkSource));
router.get('/items', asyncHandler(controller.listItems));
router.patch('/items/:id/status', asyncHandler(controller.updateItemStatus));
router.post(
  '/items/:id/create-draft',
  requirePermission(
    PERMISSIONS.CREATE_ARTICLE,
    PERMISSIONS.MANAGE_SYSTEM,
  ),
  asyncHandler(controller.createDraft),
);

export default router;