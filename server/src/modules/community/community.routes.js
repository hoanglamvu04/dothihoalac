import { Router } from 'express';
import * as c from './community.controller.js';
import { requireAuth } from '../../middlewares/auth.middleware.js';
import { validate } from '../../middlewares/validate.middleware.js';
import { contentCreateLimiter } from '../../middlewares/rateLimit.middleware.js';
import {
  createSchema,
  updateSchema,
  idSchema,
  slugSchema,
  acceptSchema,
} from './community.validation.js';
import asyncHandler from '../../utils/asyncHandler.js';

const r = Router();

r.get('/', asyncHandler(c.list));
r.post(
  '/',
  requireAuth,
  contentCreateLimiter,
  validate(createSchema),
  asyncHandler(c.create),
);

r.get(
  '/:id/edit',
  requireAuth,
  validate(idSchema),
  asyncHandler(c.editor),
);

r.patch(
  '/:id',
  requireAuth,
  validate(updateSchema),
  asyncHandler(c.update),
);

r.delete(
  '/:id',
  requireAuth,
  validate(idSchema),
  asyncHandler(c.remove),
);

r.post(
  '/:id/submit',
  requireAuth,
  validate(idSchema),
  asyncHandler(c.submit),
);

r.post(
  '/:id/accept-answer',
  requireAuth,
  validate(acceptSchema),
  asyncHandler(c.accept),
);

r.get(
  '/:slug',
  validate(slugSchema),
  asyncHandler(c.detail),
);

export default r;
