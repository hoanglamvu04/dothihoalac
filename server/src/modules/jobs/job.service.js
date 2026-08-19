import mongoose from 'mongoose';

import Content from '../contents/content.model.js';
import ContentBody from '../contents/contentBody.model.js';
import Area from '../taxonomy/area.model.js';
import JobPost from './jobPost.model.js';

import {
  createContentWithBody,
  getPublishedContentBySlug,
  getOwnedContentOrThrow,
  assertEditable,
  updateContentWithBody,
} from '../contents/content.service.js';

import {
  parsePagination,
  buildPaginationMeta,
} from '../../utils/pagination.js';
import ApiError from '../../utils/ApiError.js';

const JOB_DRAFT_TITLE = 'Bản nháp việc làm';

function escapeRegex(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function idString(value) {
  return String(value?._id || value || '');
}

function hasInitialJobPayload(data = {}) {
  return Boolean(
    data.jobType &&
      String(data.companyName || '').trim().length >= 2 &&
      String(data.workLocation || '').trim().length >= 3 &&
      data.deadline,
  );
}

function jobIsComplete(content, body, job) {
  if (!content || !job) return false;
  if (!String(content.title || '').trim() || content.title === JOB_DRAFT_TITLE) return false;
  if (!String(body?.bodyText || '').trim()) return false;
  if (!job.jobType || !String(job.companyName || '').trim()) return false;
  if (!String(job.workLocation || '').trim() || !job.deadline) return false;
  if (new Date(job.deadline).getTime() <= Date.now()) return false;

  return Boolean(
    String(job.applicationMethod || '').trim() ||
      String(job.contactEmail || '').trim() ||
      String(job.contactPhone || '').trim(),
  );
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

function emptyList(page, limit) {
  return {
    items: [],
    meta: buildPaginationMeta({ page, limit, total: 0 }),
  };
}

export async function list(query = {}) {
  const { page, limit, skip } = parsePagination(query);
  const now = new Date();

  const jobFilter = {
    deadline: { $gte: now },
  };

  if (query.type) {
    jobFilter.jobType = query.type;
  }

  if (query.experienceLevel) {
    jobFilter.experienceLevel = query.experienceLevel;
  }

  const areaId = query.area ? await resolveAreaId(query.area) : null;
  if (query.area && !areaId) {
    return emptyList(page, limit);
  }

  const queryText = String(query.q || '').trim();
  const regex = queryText ? new RegExp(escapeRegex(queryText), 'i') : null;

  const publicContentMatch = {
    'content.contentType': 'job',
    'content.status': 'published',
    'content.visibility': 'public',
    'content.deletedAt': null,
  };

  if (areaId) {
    publicContentMatch['content.primaryAreaId'] = areaId;
  }

  const pipeline = [
    { $match: jobFilter },
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

  if (regex) {
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
    return emptyList(page, limit);
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

export async function detail(slug) {
  const base = await getPublishedContentBySlug(slug, 'job');
  const job = await JobPost.findOne({ contentId: base._id }).lean();
  return { ...base, job };
}

export async function editorDetail(id, userId) {
  const content = await getOwnedContentOrThrow(id, userId, 'job');

  await content.populate([
    {
      path: 'primaryAreaId',
      select: 'name slug areaType description',
    },
    {
      path: 'thumbnailMediaId',
      select: 'url secureUrl altText width height format resourceType status',
    },
  ]);

  const [body, job] = await Promise.all([
    ContentBody.findOne({ contentId: content._id }).lean(),
    JobPost.findOne({ contentId: content._id }).lean(),
  ]);

  return {
    ...content.toObject(),
    body: body || {
      contentId: content._id,
      bodyHtml: '',
      bodyText: '',
      wordCount: 0,
      readingTime: 1,
      inlineMediaIds: [],
    },
    job: job || null,
  };
}

export async function create(userId, data) {
  if (new Date(data.deadline) <= new Date()) {
    throw new ApiError(422, 'Hạn nộp phải ở tương lai.', 'DEADLINE_INVALID');
  }

  const content = await createContentWithBody({
    authorId: userId,
    contentType: 'job',
    ...data,
    allowComments: false,
    status: 'draft',
  });

  await JobPost.create({ contentId: content._id, ...data });
  return content;
}

/**
 * Content core có thể tồn tại trước JobPost. Khi payload đã đủ các trường
 * cấu trúc, extension được tạo; trước đó autosave vẫn giữ được title/body.
 */
export async function update(id, userId, data) {
  const content = await getOwnedContentOrThrow(id, userId, 'job');
  assertEditable(content);

  if (data.deadline !== undefined && new Date(data.deadline).getTime() <= Date.now()) {
    throw new ApiError(422, 'Hạn nộp phải ở tương lai.', 'DEADLINE_INVALID');
  }

  await updateContentWithBody(
    content,
    {
      ...data,
      allowComments: false,
    },
    userId,
    'Job edit',
  );

  const existingJob = await JobPost.findOne({ contentId: id });

  if (!existingJob) {
    if (!hasInitialJobPayload(data)) {
      return content;
    }

    await JobPost.create({ contentId: id, ...data });
    return content;
  }

  Object.assign(existingJob, data);
  await existingJob.save();
  return content;
}

export async function submit(id, userId) {
  const content = await getOwnedContentOrThrow(id, userId, 'job');

  if (!['draft', 'needs_revision', 'rejected'].includes(content.status)) {
    throw new ApiError(
      409,
      'Tin tuyển dụng không thể gửi duyệt ở trạng thái hiện tại.',
      'INVALID_STATUS',
    );
  }

  const [body, job] = await Promise.all([
    ContentBody.findOne({ contentId: id }).lean(),
    JobPost.findOne({ contentId: id }).lean(),
  ]);

  if (!jobIsComplete(content, body, job)) {
    throw new ApiError(
      422,
      'Tin tuyển dụng chưa đủ thông tin để gửi duyệt. Hãy hoàn thiện vị trí, mô tả, đơn vị tuyển, địa điểm, hạn nộp và cách ứng tuyển.',
      'JOB_DRAFT_INCOMPLETE',
    );
  }

  content.status = 'pending_review';
  content.allowComments = false;
  await content.save();
  return content;
}
