import Content from '../contents/content.model.js';
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
  const b = await getPublishedContentBySlug(slug, 'job');
  const job = await JobPost.findOne({ contentId: b._id }).lean();
  return { ...b, job };
}

export async function create(userId, d) {
  if (new Date(d.deadline) <= new Date()) {
    throw new ApiError(422, 'Hạn nộp phải ở tương lai.', 'DEADLINE_INVALID');
  }

  const c = await createContentWithBody({
    authorId: userId,
    contentType: 'job',
    ...d,
    status: 'draft',
  });

  await JobPost.create({ contentId: c._id, ...d });
  return c;
}

export async function update(id, userId, d) {
  const c = await getOwnedContentOrThrow(id, userId, 'job');
  assertEditable(c);
  await updateContentWithBody(c, d, userId, 'Job edit');
  await JobPost.findOneAndUpdate(
    { contentId: id },
    d,
    { new: true, runValidators: true },
  );
  return c;
}

export async function submit(id, userId) {
  const c = await getOwnedContentOrThrow(id, userId, 'job');
  c.status = 'pending_review';
  await c.save();
  return c;
}
