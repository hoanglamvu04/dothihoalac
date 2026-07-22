import { Router } from 'express';

import * as controller from './article.controller.js';
import { optionalAuth } from '../../middlewares/auth.middleware.js';
import { validate } from '../../middlewares/validate.middleware.js';
import {
  listArticlesSchema,
  slugSchema,
  tipSchema,
} from './article.validation.js';
import asyncHandler from '../../utils/asyncHandler.js';

const router = Router();

router.get(
  '/',
  validate(listArticlesSchema),
  asyncHandler(controller.list),
);

router.post(
  '/tips',
  optionalAuth,
  validate(tipSchema),
  asyncHandler(controller.tip),
);

router.get(
  '/:slug',
  validate(slugSchema),
  asyncHandler(controller.detail),
);

export default router;