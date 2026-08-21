import Content from '../contents/content.model.js';
import JobPost from './jobPost.model.js';

import ApiError from '../../utils/ApiError.js';
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

export function companySlug(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function publicContentLookup() {
  return {
    from: Content.collection.name,
    let: { contentId: '$contentId' },
    pipeline: [
      {
        $match: {
          $expr: { $eq: ['$_id', '$$contentId'] },
          contentType: 'job',
          status: 'published',
          visibility: 'public',
          deletedAt: null,
        },
      },
      {
        $project: {
          _id: 1,
          title: 1,
          summary: 1,
          primaryAreaId: 1,
          thumbnailMediaId: 1,
          publishedAt: 1,
          createdAt: 1,
        },
      },
    ],
    as: 'content',
  };
}

async function resolveCompanyName(slug) {
  const target = companySlug(slug);
  if (!target) {
    throw new ApiError(404, 'Không tìm thấy doanh nghiệp tuyển dụng.', 'JOB_COMPANY_NOT_FOUND');
  }

  const companies = await JobPost.aggregate([
    {
      $match: {
        deadline: { $gte: new Date() },
        companyName: { $nin: [null, ''] },
      },
    },
    { $lookup: publicContentLookup() },
    { $unwind: '$content' },
    { $group: { _id: '$companyName' } },
    { $sort: { _id: 1 } },
  ]);

  const matched = companies.find((item) => companySlug(item?._id) === target);
  if (!matched?._id) {
    throw new ApiError(404, 'Không tìm thấy doanh nghiệp tuyển dụng.', 'JOB_COMPANY_NOT_FOUND');
  }

  return String(matched._id).trim();
}

async function companySummary(companyName) {
  const companyRegex = new RegExp(`^${escapeRegex(companyName)}$`, 'i');
  const [summary] = await JobPost.aggregate([
    {
      $match: {
        deadline: { $gte: new Date() },
        companyName: companyRegex,
      },
    },
    { $lookup: publicContentLookup() },
    { $unwind: '$content' },
    {
      $group: {
        _id: null,
        activeJobs: { $sum: 1 },
        openPositions: { $sum: { $ifNull: ['$positionsCount', 1] } },
        locations: { $addToSet: '$workLocation' },
        jobTypes: { $addToSet: '$jobType' },
        contactEmails: { $addToSet: '$contactEmail' },
        contactPhones: { $addToSet: '$contactPhone' },
        nextDeadline: { $min: '$deadline' },
      },
    },
  ]);

  if (!summary) {
    throw new ApiError(404, 'Doanh nghiệp hiện không có tin tuyển dụng công khai.', 'JOB_COMPANY_NOT_FOUND');
  }

  const clean = (values = []) =>
    values
      .map((value) => String(value || '').trim())
      .filter(Boolean);

  return {
    activeJobs: Number(summary.activeJobs || 0),
    openPositions: Number(summary.openPositions || 0),
    locations: clean(summary.locations).slice(0, 8),
    jobTypes: clean(summary.jobTypes),
    contactEmail: clean(summary.contactEmails)[0] || '',
    contactPhone: clean(summary.contactPhones)[0] || '',
    nextDeadline: summary.nextDeadline || null,
  };
}

export async function publicCompanyDetail(slug, query = {}) {
  const companyName = await resolveCompanyName(slug);
  const summary = await companySummary(companyName);
  const { page, limit, skip } = parsePagination({
    ...query,
    limit: query.limit || 12,
  });

  const companyRegex = new RegExp(`^${escapeRegex(companyName)}$`, 'i');
  const jobFilter = {
    deadline: { $gte: new Date() },
    companyName: companyRegex,
  };

  if (query.type) {
    jobFilter.jobType = String(query.type).trim();
  }

  if (query.experienceLevel) {
    jobFilter.experienceLevel = String(query.experienceLevel).trim();
  }

  const pipeline = [
    { $match: jobFilter },
    { $lookup: publicContentLookup() },
    { $unwind: '$content' },
  ];

  const queryText = String(query.q || '').trim();
  if (queryText) {
    const regex = new RegExp(escapeRegex(queryText), 'i');
    pipeline.push({
      $match: {
        $or: [
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
  const pageIds = rows
    .map((row) => row?.content?._id)
    .filter(Boolean);

  const jobMap = new Map(
    rows.map((row) => {
      const { content: _content, ...job } = row;
      return [idString(job.contentId), job];
    }),
  );

  const pageItems = pageIds.length
    ? await Content.find({
        _id: { $in: pageIds },
        contentType: 'job',
        status: 'published',
        visibility: 'public',
        deletedAt: null,
      })
        .populate('primaryAreaId', 'name slug')
        .populate('thumbnailMediaId', 'url secureUrl altText width height')
        .lean()
    : [];

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
    company: {
      name: companyName,
      slug: companySlug(companyName),
      ...summary,
    },
    items,
    meta: buildPaginationMeta({ page, limit, total }),
  };
}
