import { Router } from 'express';

import * as controller from './project.controller.js';
import { requireAuth } from '../../middlewares/auth.middleware.js';
import { requirePermission } from '../../middlewares/role.middleware.js';
import { PERMISSIONS } from '../../constants/permissions.js';
import { validate } from '../../middlewares/validate.middleware.js';
import asyncHandler from '../../utils/asyncHandler.js';
import {
  addUpdateSchema,
  adminListSchema,
  createProjectSchema,
  deleteUpdateSchema,
  idSchema,
  updateProjectSchema,
} from './project.validation.js';

const router = Router();
router.use(requireAuth, requirePermission(PERMISSIONS.MANAGE_SYSTEM));

router.get('/', validate(adminListSchema), asyncHandler(controller.adminList));
router.post('/', validate(createProjectSchema), asyncHandler(controller.create));
router.get('/:id', validate(idSchema), asyncHandler(controller.adminDetail));
router.patch('/:id', validate(updateProjectSchema), asyncHandler(controller.update));
router.delete('/:id', validate(idSchema), asyncHandler(controller.remove));
router.post('/:id/updates', validate(addUpdateSchema), asyncHandler(controller.addUpdate));
router.delete(
  '/:id/updates/:updateId',
  validate(deleteUpdateSchema),
  asyncHandler(controller.deleteUpdate),
);

export default router;
