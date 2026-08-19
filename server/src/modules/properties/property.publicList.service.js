import mongoose from 'mongoose';

import Content from '../contents/content.model.js';
import Area from '../taxonomy/area.model.js';
import PropertyListing from './propertyListing.model.js';

import {
  parsePagination,
  buildPaginationMeta,
} from '../../utils/pagination.js';

function escapeRegex(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function idString(value) {
  return String(value?._id || value || '');
}

function finiteNumber(value) {
  if (value === undefined || value === null || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

async function resolveAreaId(value) {
  const normalized = String(value || '').trim();
  if (!normalized) return null;

  if (mongoose.isValidObjectId(normalized)) {
    return new mongoose.Types.ObjectId(normalized);
  }

  const area = await Area.findOne({
    slug: normalized.toLowerCase(),
    isActive: true,
  })
    .select('_id')
    .lean();

  return area?._id || null;
}

function emptyResult(page, limit, total = 0) {
  return {
    items: [],
    meta: buildPaginationMeta({ page, limit, total }),
  };
}

export async function listPublicProperties(query = {}) {
  const { page, limit, skip } = parsePagination(query);

  const propertyFilter = {
    expiresAt: { $gt: new Date() },
    soldAt: null,
    rentedAt: null,
  };

  for (const key of [
    'transactionType',
    'propertyType',
    'ownerType',
    'legalStatus',
  ]) {
    if (query[key]) {
      propertyFilter[key] = query[key];
    }
  }

  const minPrice = finiteNumber(query.minPrice);
  const maxPrice = finiteNumber(query.maxPrice);
  if (minPrice !== null || maxPrice !== null) {
    propertyFilter.price = {
      ...(minPrice !== null ? { $gte: minPrice } : {}),
      ...(maxPrice !== null ? { $lte: maxPrice } : {}),
    };
  }

  const minArea = finiteNumber(query.minArea);
  const maxArea = finiteNumber(query.maxArea);
  if (minArea !== null || maxArea !== null) {
    propertyFilter.landArea = {
      ...(minArea !== null ? { $gte: minArea } : {}),
      ...(maxArea !== null ? { $lte: maxArea } : {}),
    };
  }

  const areaId = query.area ? await resolveAreaId(query.area) : null;
  if (query.area && !areaId) {
    return emptyResult(page, limit);
  }

  const publicContentMatch = {
    'content.contentType': 'property',
    'content.status': 'published',
    'content.visibility': 'public',
    'content.deletedAt': null,
  };

  if (areaId) {
    publicContentMatch['content.primaryAreaId'] = areaId;
  }

  const pipeline = [
    { $match: propertyFilter },
    {
      $lookup: {
        from: Content.collection.name,
        localField: 'contentId',
        foreignField: '_id',
        as: 'content',
      },
    },
    { $unwind: '$content' },
    { $match: publicContentMatch },
  ];

  const queryText = String(query.q || '').trim();
  if (queryText) {
    const regex = new RegExp(escapeRegex(queryText), 'i');
    pipeline.push({
      $match: {
        $or: [
          { addressText: regex },
          { 'content.title': regex },
          { 'content.summary': regex },
        ],
      },
    });
  }

  if (query.sort === 'price_asc') {
    pipeline.push({
      $sort: {
        price: 1,
        listingPriority: -1,
        createdAt: -1,
        _id: -1,
      },
    });
  } else if (query.sort === 'price_desc') {
    pipeline.push({
      $sort: {
        price: -1,
        listingPriority: -1,
        createdAt: -1,
        _id: -1,
      },
    });
  } else if (query.sort === 'oldest') {
    pipeline.push({
      $sort: {
        listingPriority: -1,
        createdAt: 1,
        _id: 1,
      },
    });
  } else {
    pipeline.push({
      $sort: {
        listingPriority: -1,
        createdAt: -1,
        _id: -1,
      },
    });
  }

  pipeline.push({
    $facet: {
      rows: [
        { $skip: skip },
        { $limit: limit },
      ],
      total: [{ $count: 'count' }],
    },
  });

  const [result] = await PropertyListing.aggregate(pipeline);
  const rows = result?.rows || [];
  const total = Number(result?.total?.[0]?.count || 0);

  if (!rows.length) {
    return emptyResult(page, limit, total);
  }

  const pageIds = rows
    .map((row) => row?.content?._id)
    .filter(Boolean);

  const propertyMap = new Map(
    rows.map((row) => {
      const { content: _content, ...property } = row;
      return [idString(property.contentId), property];
    }),
  );

  const pageItems = await Content.find({
    _id: { $in: pageIds },
    contentType: 'property',
    status: 'published',
    visibility: 'public',
    deletedAt: null,
  })
    .populate('primaryAreaId', 'name slug')
    .populate('thumbnailMediaId', 'url secureUrl altText width height')
    .lean();

  const pageMap = new Map(
    pageItems.map((item) => [idString(item._id), item]),
  );

  const items = pageIds
    .map((id) => pageMap.get(idString(id)))
    .filter(Boolean)
    .map((item) => ({
      ...item,
      property: propertyMap.get(idString(item._id)) || null,
    }));

  return {
    items,
    meta: buildPaginationMeta({ page, limit, total }),
  };
}
