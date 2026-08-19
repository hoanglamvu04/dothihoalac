import * as s from './system.service.js';
import { homeFeed as loadHomeFeed } from './homeFeed.service.js';
import { sendCreated, sendSuccess } from '../../utils/apiResponse.js';

export async function homeFeed(req, res) {
  res.set('Cache-Control', 'public, max-age=10, stale-while-revalidate=30');
  return sendSuccess(res, { data: await loadHomeFeed() });
}

export async function page(req, res) {
  return sendSuccess(res, { data: await s.page(req.params.slug) });
}

export async function banners(req, res) {
  return sendSuccess(res, { data: await s.banners(req.query) });
}

export async function bannerImpression(req, res) {
  return sendSuccess(res, {
    data: await s.trackBannerMetric(req.params.id, 'impression'),
  });
}

export async function bannerClick(req, res) {
  return sendSuccess(res, {
    data: await s.trackBannerMetric(req.params.id, 'click'),
  });
}

export async function settings(req, res) {
  return sendSuccess(res, { data: await s.settings() });
}

export async function updateSetting(req, res) {
  return sendSuccess(res, {
    data: await s.setSetting(req.user._id, req.params.key, req.body.value, req.body.valueType),
    message: 'Đã lưu cấu hình.',
  });
}

export async function pages(req, res) {
  return sendSuccess(res, { data: await s.listPages() });
}

export async function savePage(req, res) {
  return req.params.id
    ? sendSuccess(res, { data: await s.savePage(req.user._id, req.body, req.params.id) })
    : sendCreated(res, await s.savePage(req.user._id, req.body));
}

export async function adminBanners(req, res) {
  return sendSuccess(res, { data: await s.listBanners(req.query) });
}

export async function saveBanner(req, res) {
  return req.params.id
    ? sendSuccess(res, {
        data: await s.saveBanner(req.user._id, req.body, req.params.id),
        message: 'Đã cập nhật quảng cáo.',
      })
    : sendCreated(
        res,
        await s.saveBanner(req.user._id, req.body),
        'Đã tạo quảng cáo.',
      );
}

export async function toggleBanner(req, res) {
  return sendSuccess(res, {
    data: await s.toggleBanner(req.user._id, req.params.id, req.body.isActive),
    message: req.body.isActive ? 'Đã bật quảng cáo.' : 'Đã tắt quảng cáo.',
  });
}

export async function deleteBanner(req, res) {
  return sendSuccess(res, {
    data: await s.deleteBanner(req.user._id, req.params.id),
    message: 'Đã xóa quảng cáo.',
  });
}

export async function logs(req, res) {
  const r = await s.auditLogs(req.query);
  return sendSuccess(res, { data: r.items, meta: r.meta });
}
