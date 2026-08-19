import * as s from './job.service.js';
import { listPublicJobs } from './job.publicList.service.js';
import { sendCreated, sendSuccess } from '../../utils/apiResponse.js';

export async function list(req, res) {
  const r = await listPublicJobs(req.query);
  return sendSuccess(res, { data: r.items, meta: r.meta });
}

export async function detail(req, res) {
  return sendSuccess(res, { data: await s.detail(req.params.slug) });
}

export async function editor(req, res) {
  return sendSuccess(res, {
    data: await s.editorDetail(req.params.id, req.user._id),
  });
}

export async function create(req, res) {
  return sendCreated(res, await s.create(req.user._id, req.body), 'Đã tạo tin việc làm.');
}

export async function update(req, res) {
  return sendSuccess(res, {
    data: await s.update(req.params.id, req.user._id, req.body),
    message: 'Đã cập nhật.',
  });
}

export async function submit(req, res) {
  return sendSuccess(res, {
    data: await s.submit(req.params.id, req.user._id),
    message: 'Đã gửi duyệt.',
  });
}
