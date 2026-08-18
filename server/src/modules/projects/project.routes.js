import { Router } from 'express';

import * as controller from './project.controller.js';
import { validate } from '../../middlewares/validate.middleware.js';
import asyncHandler from '../../utils/asyncHandler.js';
import {
  publicListSchema,
  publicSlugSchema,
} from './project.validation.js';

const router = Router();

router.get(
  '/',
  validate(publicListSchema),
  asyncHandler(controller.listPublic),
);

router.get(
  '/:slug',
  validate(publicSlugSchema),
  asyncHandler(controller.publicDetail),
);

export default router;
