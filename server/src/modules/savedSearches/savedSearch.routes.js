import { Router } from 'express';
import { requireAuth } from '../../middlewares/auth.middleware.js';
import asyncHandler from '../../utils/asyncHandler.js';
import { sendCreated, sendSuccess } from '../../utils/apiResponse.js';
import * as service from './savedSearch.service.js';

const router = Router();
router.use(requireAuth);
router.get('/', asyncHandler(async (req, res) => {
  return sendSuccess(res, { data: await service.listSavedSearches(req.user._id) });
}));
router.post('/', asyncHandler(async (req, res) => {
  return sendCreated(res, await service.createSavedSearch(req.user._id, req.body), 'Đã lưu tìm kiếm.');
}));
router.patch('/:id', asyncHandler(async (req, res) => {
  return sendSuccess(res, {
    data: await service.setSavedSearchActive(req.user._id, req.params.id, req.body?.isActive),
  });
}));
router.delete('/:id', asyncHandler(async (req, res) => {
  return sendSuccess(res, { data: await service.deleteSavedSearch(req.user._id, req.params.id) });
}));
export default router;
