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
let facetRowsCache = null;
let facetRowsExpireAt = 0;

function normalizeId(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function itemHasId(item, primaryKey, listKey, expectedId) {
  if (!expectedId) return true;

  const ids = [
    item?.[primaryKey],
    ...(Array.isArray(item?.[listKey]) ? item[listKey] : []),
  ];

  return ids.some((id) => id && String(id) === expectedId);
}

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

async function getPublishedFacetRows() {
  const now = Date.now();

  if (facetRowsCache && facetRowsExpireAt > now) {
    return facetRowsCache;
  }

  facetRowsCache = await Content.find({
    contentType: 'article',
    status: 'published',
    visibility: 'public',
    deletedAt: null,
  })
    .select('primaryCategoryId categoryIds primaryAreaId areaIds')
    .lean();

  facetRowsExpireAt = now + FACET_CACHE_TTL_MS;
  return facetRowsCache;
}

async function getPublishedArticleFacets(query = {}) {
  const rows = await getPublishedFacetRows();
  const selectedCategoryId = normalizeId(
    query.categories || query.category,
  );
  const selectedAreaId = normalizeId(query.areas || query.area);

  const categoryRows = selectedAreaId
    ? rows.filter((item) =>
        itemHasId(item, 'primaryAreaId', 'areaIds', selectedAreaId),
      )
    : rows;

  const areaRows = selectedCategoryId
    ? rows.filter((item) =>
        itemHasId(
          item,
          'primaryCategoryId',
          'categoryIds',
          selectedCategoryId,
        ),
      )
    : rows;

  return {
    categories: countIds(
      categoryRows,
      'primaryCategoryId',
      'categoryIds',
    ),
    areas: countIds(areaRows, 'primaryAreaId', 'areaIds'),
  };
}

export async function list(req, res) {
  const [r, facets] = await Promise.all([
    listPublicArticles(req.query),
    getPublishedArticleFacets(req.query),
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
