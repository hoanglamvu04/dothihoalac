import { Router } from 'express';
import { run } from './search.controller.js';
import { optionalAuth } from '../../middlewares/auth.middleware.js';
import asyncHandler from '../../utils/asyncHandler.js';

const r = Router();

r.get('/', optionalAuth, asyncHandler(run));

export default r;
