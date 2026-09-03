import { Router } from 'express';
import { admin } from './taxonomy.controller.js';
import { requireAuth } from '../../middlewares/auth.middleware.js';
import { requirePermission } from '../../middlewares/role.middleware.js';
import { PERMISSIONS } from '../../constants/permissions.js';
import asyncHandler from '../../utils/asyncHandler.js';

const router = Router();

router.use(
  requireAuth,
  requirePermission(PERMISSIONS.MANAGE_TAXONOMY, PERMISSIONS.MANAGE_SYSTEM),
);

for (const [type, path] of [
  ['categories', 'categories'],
  ['tags', 'tags'],
  ['areas', 'areas'],
]) {
  const controller = admin(type);

  router.get('/' + path, asyncHandler(controller.list));
  router.post('/' + path, asyncHandler(controller.create));
  router.patch('/' + path + '/:id', asyncHandler(controller.update));
  router.delete('/' + path + '/:id', asyncHandler(controller.remove));
}

export default router;
