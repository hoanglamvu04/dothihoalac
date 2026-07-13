import { Router } from 'express';
import { create } from './report.controller.js';
import { requireAuth } from '../../middlewares/auth.middleware.js';
import { validate } from '../../middlewares/validate.middleware.js';
import { createSchema } from './report.validation.js';
import asyncHandler from '../../utils/asyncHandler.js';
const r = Router();
r.post('/', requireAuth, validate(createSchema), asyncHandler(create));
export default r;
