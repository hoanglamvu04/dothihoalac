import { Router } from 'express';

import { requireAuth } from '../../middlewares/auth.middleware.js';
import {
  uploadSingleDocument,
  uploadSingleImage,
} from '../../middlewares/upload.middleware.js';
import asyncHandler from '../../utils/asyncHandler.js';

import {
  deleteMedia,
  listOwnMedia,
  uploadDocument,
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

router.post(
  ['/documents', '/upload-document'],
  uploadSingleDocument,
  asyncHandler(uploadDocument),
);

router.delete('/:id', asyncHandler(deleteMedia));

export default router;
