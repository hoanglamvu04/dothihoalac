import mongoose from 'mongoose';

import Content from '../contents/content.model.js';
import Category from '../taxonomy/category.model.js';
import Area from '../taxonomy/area.model.js';
import Tag from '../taxonomy/tag.model.js';

import {
  parsePagination,
  buildPaginationMeta,
} from '../../utils/pagination.js';

import { escapeRegex } from '../../utils/escapeRegex.js';
import ApiError from '../../utils/ApiError.js';

function normalize(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function splitValues(value) {
  return [
    ...new Set(
      normalize(value)
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  ];
}

async function resolveTaxonomyIds(Model, values, extraFilter = {}) {
  const normalized = splitValues(values);
  if (!normalized.length) return [];

  const objectIds = normalized.filter((value) =>
    mongoose.isValidObjectId(value),
  );

  const slugs = normalized
    .filter((value) => !mongoose.isValidObjectId(value))
    .map((value) => value.toLowerCase());

  const clauses = [];
  if (objectIds.length) clauses.push({ _id: { $in: objectIds } });
  if (slugs.length) clauses.push({ slug: { $in: slugs } });

  const documents = await Model.find({
    isActive: true,
    ...extraFilter,
    ...(clauses.length ? { $or: clauses } : {}),
  })
    .select('_id')
    .lean();

  return documents.map((item) => item._id);
}

function parseOptionalDate(value, fieldName) {
  const normalized = normalize(value);
  if (!normalized) return null;

  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) {
    throw new ApiError(
      422,
      `${fieldName} không hợp lệ.`,
      'INVALID_DATE',
      { field: fieldName, value },
    );
  }

  return date;
}

export async function listPublicArticles(query = {}) {
  const { page, limit, skip } = parsePagination(query);

  const categoryValues = query.categories || query.category || '';
  const areaValues = query.areas || query.area || '';

  const [categoryIds, areaIds, tagIds] = await Promise.all([
    resolveTaxonomyIds(Category, categoryValues, {
      contentScope: { $in: ['article', 'all'] },
    }),
    resolveTaxonomyIds(Area, areaValues),
    resolveTaxonomyIds(Tag, query.tag || ''),
  ]);

  if (splitValues(categoryValues).length && !categoryIds.length) {
    return {
      items: [],
      meta: buildPaginationMeta({ page, limit, total: 0 }),
    };
  }

  if (splitValues(areaValues).length && !areaIds.length) {
    return {
      items: [],
      meta: buildPaginationMeta({ page, limit, total: 0 }),
    };
  }

  const filter = {
    contentType: 'article',
    status: 'published',
    visibility: 'public',
    deletedAt: null,
  };

  if (query.featured === 'true') {
    filter.isFeatured = true;
  } else if (query.featured === 'false') {
    filter.isFeatured = false;
  }

  const and = [];

  if (categoryIds.length) {
    and.push({
      $or: [
        { primaryCategoryId: { $in: categoryIds } },
        { categoryIds: { $in: categoryIds } },
      ],
    });
  }

  if (areaIds.length) {
    and.push({
      $or: [
        { primaryAreaId: { $in: areaIds } },
        { areaIds: { $in: areaIds } },
      ],
    });
  }

  if (tagIds.length) {
    and.push({ tagIds: { $in: tagIds } });
  }

  const keyword = normalize(query.q);
  if (keyword) {
    const expression = new RegExp(escapeRegex(keyword), 'i');
    and.push({
      $or: [
        { title: expression },
        { summary: expression },
        { bodyText: expression },
      ],
    });
  }

  const publishedFrom = parseOptionalDate(
    query.publishedFrom,
    'publishedFrom',
  );

  const publishedTo = parseOptionalDate(
    query.publishedTo,
    'publishedTo',
  );

  if (publishedFrom && publishedTo && publishedFrom > publishedTo) {
    throw new ApiError(
      422,
      'Khoảng ngày đăng không hợp lệ.',
      'INVALID_DATE_RANGE',
    );
  }

  if (publishedFrom || publishedTo) {
    filter.publishedAt = {};
    if (publishedFrom) filter.publishedAt.$gte = publishedFrom;
    if (publishedTo) filter.publishedAt.$lte = publishedTo;
  }

  if (and.length) filter.$and = and;

  const sort =
    query.sort === 'popular'
      ? { viewCount: -1, publishedAt: -1, _id: -1 }
      : { publishedAt: -1, createdAt: -1, _id: -1 };

  const [items, total] = await Promise.all([
    Content.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .populate({
        path: 'authorId',
        select: 'username displayName status',
      })
      .populate({
        path: 'primaryCategoryId',
        select: 'name slug contentScope description',
      })
      .populate({
        path: 'primaryAreaId',
        select: 'name slug areaType description',
      })
      .populate({
        path: 'thumbnailMediaId',
        select: 'provider publicId assetId url secureUrl resourceType format width height fileSize altText status',
      })
      .lean(),
    Content.countDocuments(filter),
  ]);

  return {
    items,
    meta: buildPaginationMeta({ page, limit, total }),
  };
}
