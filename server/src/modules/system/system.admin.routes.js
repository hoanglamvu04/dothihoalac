import { Router } from 'express';
import * as c from './system.controller.js';
import { requireAuth } from '../../middlewares/auth.middleware.js';
import { requirePermission } from '../../middlewares/role.middleware.js';
import { PERMISSIONS } from '../../constants/permissions.js';
import asyncHandler from '../../utils/asyncHandler.js';

const r = Router();
r.use(requireAuth, requirePermission(PERMISSIONS.MANAGE_SYSTEM));

r.get('/settings', asyncHandler(c.settings));
r.patch('/settings/:key', asyncHandler(c.updateSetting));

r.get('/pages', asyncHandler(c.pages));
r.post('/pages', asyncHandler(c.savePage));
r.patch('/pages/:id', asyncHandler(c.savePage));

r.get('/banners', asyncHandler(c.adminBanners));
r.post('/banners', asyncHandler(c.saveBanner));
r.patch('/banners/:id', asyncHandler(c.saveBanner));
r.patch('/banners/:id/toggle', asyncHandler(c.toggleBanner));
r.delete('/banners/:id', asyncHandler(c.deleteBanner));

r.get('/activity-logs', asyncHandler(c.logs));

export default r;
