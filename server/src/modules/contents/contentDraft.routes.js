import { Router } from 'express';
import * as controller from './contentDraft.controller.js';
import { requireAuth } from '../../middlewares/auth.middleware.js';
import { validate } from '../../middlewares/validate.middleware.js';
import { contentCreateLimiter } from '../../middlewares/rateLimit.middleware.js';
import asyncHandler from '../../utils/asyncHandler.js';
import {
  createDraftSchema,
  draftIdSchema,
} from './contentDraft.validation.js';

const router = Router();

router.post(
  '/',
  requireAuth,
  contentCreateLimiter,
  validate(createDraftSchema),
  asyncHandler(controller.create),
);

router.get(
  '/:id',
  requireAuth,
  validate(draftIdSchema),
  asyncHandler(controller.detail),
);

router.delete(
  '/:id',
  requireAuth,
  validate(draftIdSchema),
  asyncHandler(controller.remove),
);

export default router;
