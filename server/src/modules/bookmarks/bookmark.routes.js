import { Router } from 'express';
import * as c from './bookmark.controller.js';
import { requireAuth } from '../../middlewares/auth.middleware.js';
import asyncHandler from '../../utils/asyncHandler.js';
const r = Router();
r.put('/:contentId', requireAuth, asyncHandler(c.put));
r.delete('/:contentId', requireAuth, asyncHandler(c.remove));
export default r;
