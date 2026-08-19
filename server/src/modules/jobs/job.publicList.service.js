import mongoose from 'mongoose';

import Content from '../contents/content.model.js';
import Area from '../taxonomy/area.model.js';
import JobPost from './jobPost.model.js';

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

export async function listPublicJobs(query = {}) {
  const { page, limit, skip } = parsePagination(query);

  const jobFilter = {
    deadline: { $gte: new Date() },
  };

  if (query.type) {
    jobFilter.jobType = query.type;
  }

  if (query.experienceLevel) {
    jobFilter.experienceLevel = query.experienceLevel;
  }

  const areaId = query.area ? await resolveAreaId(query.area) : null;
  if (query.area && !areaId) {
    return emptyResult(page, limit);
  }

  const contentLookupMatch = {
    $expr: { $eq: ['$_id', '$$contentId'] },
    contentType: 'job',
    status: 'published',
    visibility: 'public',
    deletedAt: null,
  };

  if (areaId) {
    contentLookupMatch.primaryAreaId = areaId;
  }

  const pipeline = [
    { $match: jobFilter },
    {
      $lookup: {
        from: Content.collection.name,
        let: { contentId: '$contentId' },
        pipeline: [
          { $match: contentLookupMatch },
          {
            $project: {
              _id: 1,
              title: 1,
              summary: 1,
              primaryAreaId: 1,
              publishedAt: 1,
              createdAt: 1,
            },
          },
        ],
        as: 'content',
      },
    },
    { $unwind: '$content' },
  ];

  const queryText = String(query.q || '').trim();
  if (queryText) {
    const regex = new RegExp(escapeRegex(queryText), 'i');
    pipeline.push({
      $match: {
        $or: [
          { companyName: regex },
          { workLocation: regex },
          { 'content.title': regex },
          { 'content.summary': regex },
        ],
      },
    });
  }

  if (query.sort === 'deadline_asc') {
    pipeline.push({
      $sort: {
        deadline: 1,
        'content.publishedAt': -1,
        'content._id': -1,
      },
    });
  } else if (query.sort === 'deadline_desc') {
    pipeline.push({
      $sort: {
        deadline: -1,
        'content.publishedAt': -1,
        'content._id': -1,
      },
    });
  } else {
    pipeline.push({
      $sort: {
        'content.publishedAt': -1,
        'content.createdAt': -1,
        'content._id': -1,
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

  const [result] = await JobPost.aggregate(pipeline);
  const rows = result?.rows || [];
  const total = Number(result?.total?.[0]?.count || 0);

  if (!rows.length) {
    return emptyResult(page, limit, total);
  }

  const pageIds = rows
    .map((row) => row?.content?._id)
    .filter(Boolean);

  const jobMap = new Map(
    rows.map((row) => {
      const { content: _content, ...job } = row;
      return [idString(job.contentId), job];
    }),
  );

  const pageItems = await Content.find({
    _id: { $in: pageIds },
    contentType: 'job',
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
      job: jobMap.get(idString(item._id)) || null,
    }));

  return {
    items,
    meta: buildPaginationMeta({ page, limit, total }),
  };
}
