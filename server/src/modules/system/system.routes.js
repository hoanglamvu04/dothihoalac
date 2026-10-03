import { Router } from 'express';
import {
  homeFeed,
  page,
  banners,
  bannerImpression,
  bannerClick,
  branding,
  clientError,
} from './system.controller.js';
import asyncHandler from '../../utils/asyncHandler.js';
import { clientErrorLimiter } from '../../middlewares/rateLimit.middleware.js';

const r = Router();

r.post('/client-errors', clientErrorLimiter, asyncHandler(clientError));
r.get('/home-feed', asyncHandler(homeFeed));
r.get('/branding', asyncHandler(branding));
r.get('/pages/:slug', asyncHandler(page));
r.get('/banners', asyncHandler(banners));
r.post('/banners/:id/impression', asyncHandler(bannerImpression));
r.post('/banners/:id/click', asyncHandler(bannerClick));

export default r;
