import * as s from './article.service.js';
import { listPublicArticles } from './article.publicList.service.js';
import { adminArticleDetail } from './article.admin.detail.service.js';
import { adminUpdateMetadata as updateMetadata } from './article.metadata.service.js';
import {
  adminDeleteArticle as deleteArticle,
  adminDeleteArticles as deleteArticles,
} from './article.admin.delete.service.js';
import Content from '../contents/content.model.js';
import { sendCreated, sendSuccess } from '../../utils/apiResponse.js';

const FACET_CACHE_TTL_MS = 60_000;
let facetCache = null;
let facetCacheExpiresAt = 0;

function countIds(items = [], primaryKey, listKey) {
  const counts = new Map();

  items.forEach((item) => {
    const ids = new Set([
      item?.[primaryKey],
      ...(Array.isArray(item?.[listKey]) ? item[listKey] : []),
    ]);

    ids.forEach((id) => {
      if (!id) return;
      const key = String(id);
      counts.set(key, (counts.get(key) || 0) + 1);
    });
  });

  return [...counts.entries()]
    .map(([id, count]) => ({ id, count }))
    .sort((a, b) => b.count - a.count);
}

async function getPublishedArticleFacets() {
  const now = Date.now();

  if (facetCache && facetCacheExpiresAt > now) {
    return facetCache;
  }

  const articles = await Content.find({
    contentType: 'article',
    status: 'published',
    visibility: 'public',
    deletedAt: null,
  })
    .select('primaryCategoryId categoryIds primaryAreaId areaIds')
    .lean();

  facetCache = {
    categories: countIds(
      articles,
      'primaryCategoryId',
      'categoryIds',
    ),
    areas: countIds(
      articles,
      'primaryAreaId',
      'areaIds',
    ),
  };

  facetCacheExpiresAt = now + FACET_CACHE_TTL_MS;
  return facetCache;
}

export async function list(req, res) {
  const [r, facets] = await Promise.all([
    listPublicArticles(req.query),
    getPublishedArticleFacets(),
  ]);

  return sendSuccess(res, {
    data: r.items,
    meta: {
      ...r.meta,
      facets,
    },
  });
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

export async function adminUpdateMetadata(req, res) {
  const updated = await updateMetadata(
    req.params.id,
    req.user._id,
    req.body,
  );

  return sendSuccess(res, {
    data: updated,
    message: 'Đã lưu thuộc tính bài viết.',
  });
}

export async function adminDelete(req, res) {
  const result = await deleteArticle(req.params.id);

  return sendSuccess(res, {
    data: result,
    message: 'Đã xóa bài viết.',
  });
}

export async function adminBulkDelete(req, res) {
  const result = await deleteArticles(req.body.ids);

  return sendSuccess(res, {
    data: result,
    message: `Đã xóa ${result.deletedCount} bài viết.`,
  });
}

export async function adminUpdate(req, res) {
  const updated = await s.adminUpdate(req.params.id, req.user._id, req.body);
  return sendSuccess(res, {
    data: await adminArticleDetail(updated._id),
    message: 'Đã cập nhật bài viết.',
  });
}
