import { Router } from 'express';

import * as controller from './article.controller.js';
import { optionalAuth } from '../../middlewares/auth.middleware.js';
import { validate } from '../../middlewares/validate.middleware.js';
import { servePendingContentPreview } from '../contents/pendingContentPreview.middleware.js';
import {
  listArticlesSchema,
  slugSchema,
  tipSchema,
} from './article.validation.js';
import asyncHandler from '../../utils/asyncHandler.js';

const router = Router();
const pendingPreview = servePendingContentPreview('article');

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
  optionalAuth,
  validate(slugSchema),
  asyncHandler(pendingPreview),
  asyncHandler(controller.detail),
);

export default router;
