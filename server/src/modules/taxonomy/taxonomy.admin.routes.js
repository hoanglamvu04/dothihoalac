import { Router } from 'express';
import { admin } from './taxonomy.controller.js';
import { requireAuth } from '../../middlewares/auth.middleware.js';
import { requirePermission } from '../../middlewares/role.middleware.js';
import { PERMISSIONS } from '../../constants/permissions.js';
import asyncHandler from '../../utils/asyncHandler.js';
const r = Router();
r.use(requireAuth, requirePermission(PERMISSIONS.MANAGE_TAXONOMY, PERMISSIONS.MANAGE_SYSTEM));
for (const [type, path] of [
  ['categories', 'categories'],
  ['tags', 'tags'],
  ['areas', 'areas'],
]) {
  const c = admin(type);
  r.post('/' + path, asyncHandler(c.create));
  r.patch('/' + path + '/:id', asyncHandler(c.update));
  r.delete('/' + path + '/:id', asyncHandler(c.remove));
}
export default r;
