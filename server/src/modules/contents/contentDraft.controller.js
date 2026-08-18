import * as service from './contentDraft.service.js';
import { sendCreated, sendSuccess } from '../../utils/apiResponse.js';

export async function create(req, res) {
  return sendCreated(
    res,
    await service.createDraft(req.user._id, req.body),
    'Đã tạo bản nháp trên máy chủ.',
  );
}

export async function detail(req, res) {
  return sendSuccess(res, {
    data: await service.draftDetail(req.params.id, req.user._id),
  });
}

export async function remove(req, res) {
  return sendSuccess(res, {
    data: await service.removeDraft(req.params.id, req.user._id),
    message: 'Đã xóa bản nháp.',
  });
}
