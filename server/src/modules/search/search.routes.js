import { Router } from 'express';
import { run, suggest } from './search.controller.js';
import { optionalAuth } from '../../middlewares/auth.middleware.js';
import { searchSuggestLimiter } from '../../middlewares/rateLimit.middleware.js';
import asyncHandler from '../../utils/asyncHandler.js';

const r = Router();

r.get('/suggest', searchSuggestLimiter, asyncHandler(suggest));
r.get('/', optionalAuth, asyncHandler(run));

export default r;
