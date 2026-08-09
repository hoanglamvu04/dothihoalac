import * as s from './article.service.js';
import { adminArticleDetail } from './article.admin.detail.service.js';
import { sendCreated, sendSuccess } from '../../utils/apiResponse.js';

export async function list(req, res) {
  const r = await s.list(req.query);
  return sendSuccess(res, { data: r.items, meta: r.meta });
}

export async function detail(req, res) {
  return sendSuccess(res, { data: await s.detail(req.params.slug) });
}

export async function tip(req, res) {
  return sendCreated(
    res,
    await s.submitTip(req.user?._id ?? null, req.body),
    'Đã gửi thông tin tới Ban biên tập.',
  );
}

export async function adminList(req, res) {
  const r = await s.adminList(req.query);
  return sendSuccess(res, { data: r.items, meta: r.meta });
}

export async function adminDetail(req, res) {
  return sendSuccess(res, { data: await adminArticleDetail(req.params.id) });
}

export async function adminCreate(req, res) {
  const created = await s.adminCreate(req.user._id, req.body);
  return sendCreated(
    res,
    await adminArticleDetail(created._id),
    'Đã tạo bài viết.',
  );
}

export async function adminUpdate(req, res) {
  const updated = await s.adminUpdate(req.params.id, req.user._id, req.body);
  return sendSuccess(res, {
    data: await adminArticleDetail(updated._id),
    message: 'Đã cập nhật bài viết.',
  });
}
