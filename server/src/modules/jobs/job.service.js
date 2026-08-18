import Content from '../contents/content.model.js';
import ContentBody from '../contents/contentBody.model.js';
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

function timeValue(value) {
  const date = value ? new Date(value) : null;
  const time = date?.getTime();
  return Number.isFinite(time) ? time : 0;
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

export async function list(query) {
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

  const jobDetails = await JobPost.find(jobFilter).lean();
  const contentIds = jobDetails.map((item) => item.contentId);

  if (!contentIds.length) {
    return {
      items: [],
      meta: buildPaginationMeta({ page, limit, total: 0 }),
    };
  }

  const contentFilter = {
    _id: { $in: contentIds },
    contentType: 'job',
    status: 'published',
    deletedAt: null,
  };

  if (query.area) {
    contentFilter.primaryAreaId = query.area;
  }

  const queryText = String(query.q || '').trim();

  if (queryText) {
    const regex = new RegExp(escapeRegex(queryText), 'i');

    const matchedJobIds = jobDetails
      .filter(
        (job) =>
          regex.test(String(job.companyName || '')) ||
          regex.test(String(job.workLocation || '')),
      )
      .map((job) => job.contentId);

    contentFilter.$or = [
      { title: regex },
      { summary: regex },
      ...(matchedJobIds.length
        ? [{ _id: { $in: matchedJobIds } }]
        : []),
    ];
  }

  const matchingContents = await Content.find(contentFilter)
    .select('_id publishedAt createdAt')
    .lean();

  const jobMap = new Map(
    jobDetails.map((job) => [idString(job.contentId), job]),
  );

  const orderedContents = [...matchingContents];

  if (query.sort === 'deadline_asc') {
    orderedContents.sort(
      (a, b) =>
        timeValue(jobMap.get(idString(a._id))?.deadline) -
        timeValue(jobMap.get(idString(b._id))?.deadline),
    );
  } else if (query.sort === 'deadline_desc') {
    orderedContents.sort(
      (a, b) =>
        timeValue(jobMap.get(idString(b._id))?.deadline) -
        timeValue(jobMap.get(idString(a._id))?.deadline),
    );
  } else {
    orderedContents.sort(
      (a, b) =>
        timeValue(b.publishedAt || b.createdAt) -
        timeValue(a.publishedAt || a.createdAt),
    );
  }

  const orderedIds = orderedContents.map((item) => item._id);
  const pageIds = orderedIds.slice(skip, skip + limit);
  const total = orderedIds.length;

  let items = [];

  if (pageIds.length) {
    const pageItems = await Content.find({
      _id: { $in: pageIds },
      contentType: 'job',
      status: 'published',
      deletedAt: null,
    })
      .populate('primaryAreaId', 'name slug')
      .populate('thumbnailMediaId', 'url secureUrl altText width height')
      .lean();

    const pageMap = new Map(
      pageItems.map((item) => [idString(item._id), item]),
    );

    items = pageIds
      .map((id) => pageMap.get(idString(id)))
      .filter(Boolean);
  }

  return {
    items: items.map((item) => ({
      ...item,
      job: jobMap.get(idString(item._id)) || null,
    })),
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

  await updateContentWithBody(content, data, userId, 'Job edit');

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
  await content.save();
  return content;
}
