import { Router } from 'express';

import { requireAuth } from '../../middlewares/auth.middleware.js';
import { uploadSingleImage } from '../../middlewares/upload.middleware.js';
import asyncHandler from '../../utils/asyncHandler.js';

import {
  deleteMedia,
  listOwnMedia,
  uploadMedia,
} from './media.controller.js';

const router = Router();

router.use(requireAuth);

router.get('/', asyncHandler(listOwnMedia));

router.post(
  ['/images', '/upload-image'],
  uploadSingleImage,
  asyncHandler(uploadMedia),
);

router.delete('/:id', asyncHandler(deleteMedia));

export default router;
