import { Router } from 'express';
import { page, banners } from './system.controller.js';
import asyncHandler from '../../utils/asyncHandler.js';
const r = Router();
r.get('/pages/:slug', asyncHandler(page));
r.get('/banners', asyncHandler(banners));
export default r;
