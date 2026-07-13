import { Router } from 'express';
import * as c from './follow.controller.js';
import { requireAuth } from '../../middlewares/auth.middleware.js';
import asyncHandler from '../../utils/asyncHandler.js';
const r = Router();
r.get('/', requireAuth, asyncHandler(c.list));
r.put('/:targetType/:targetId', requireAuth, asyncHandler(c.put));
r.delete('/:targetType/:targetId', requireAuth, asyncHandler(c.remove));
export default r;
