import { sendSuccess } from '../../utils/apiResponse.js';
import { createDraftFromSourceItem } from './sourceWatch.draft.service.js';
import * as sourceWatchService from './sourceWatch.service.js';

export async function overview(_req, res) {
  return sendSuccess(res, {
    data: await sourceWatchService.overview(),
  });
}

export async function listSources(_req, res) {
  return sendSuccess(res, {
    data: await sourceWatchService.listSources(),
  });
}

export async function createSource(req, res) {
  return sendSuccess(res, {
    statusCode: 201,
    data: await sourceWatchService.createSource(req.user?._id || null, req.body),
    message: 'Đã thêm nguồn theo dõi.',
  });
}

export async function updateSource(req, res) {
  return sendSuccess(res, {
    data: await sourceWatchService.updateSource(req.params.id, req.body),
    message: 'Đã cập nhật nguồn theo dõi.',
  });
}

export async function checkSource(req, res) {
  return sendSuccess(res, {
    data: await sourceWatchService.checkSource(req.params.id),
    message: 'Đã kiểm tra nguồn.',
  });
}

export async function listItems(req, res) {
  const result = await sourceWatchService.listItems(req.query);
  return sendSuccess(res, {
    data: result.items,
    meta: result.meta,
  });
}

export async function updateItemStatus(req, res) {
  return sendSuccess(res, {
    data: await sourceWatchService.updateItemStatus(req.params.id, req.body?.status),
    message: 'Đã cập nhật trạng thái tin nguồn.',
  });
}

export async function createDraft(req, res) {
  return sendSuccess(res, {
    statusCode: 201,
    data: await createDraftFromSourceItem(req.params.id, req.user?._id || null),
    message: 'Đã tạo bản nháp biên tập từ tin nguồn.',
  });
}
