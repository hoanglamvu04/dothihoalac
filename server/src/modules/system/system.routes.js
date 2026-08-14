import { Router } from 'express';
import {
  page,
  banners,
  bannerImpression,
  bannerClick,
} from './system.controller.js';
import asyncHandler from '../../utils/asyncHandler.js';

const r = Router();

r.get('/pages/:slug', asyncHandler(page));
r.get('/banners', asyncHandler(banners));
r.post('/banners/:id/impression', asyncHandler(bannerImpression));
r.post('/banners/:id/click', asyncHandler(bannerClick));

export default r;
