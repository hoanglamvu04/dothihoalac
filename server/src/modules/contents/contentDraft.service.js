import ContentBody from './contentBody.model.js';
import { createContentWithBody, getOwnedContentOrThrow } from './content.service.js';
import CommunityPost from '../community/communityPost.model.js';
import PropertyListing from '../properties/propertyListing.model.js';
import JobPost from '../jobs/jobPost.model.js';
import ModerationAction from '../moderation/moderationAction.model.js';
import ApiError from '../../utils/ApiError.js';

const PLACEHOLDER_TITLES = Object.freeze({
  community: 'Bản nháp cộng đồng',
  property: 'Bản nháp bất động sản',
  job: 'Bản nháp việc làm',
});

const EDITABLE_STATUSES = new Set(['draft', 'needs_revision', 'rejected']);

function plain(value) {
  return typeof value?.toObject === 'function' ? value.toObject() : value;
}

function meaningfulTitle(content) {
  const placeholder = PLACEHOLDER_TITLES[content?.contentType] || '';
  return Boolean(content?.title && content.title !== placeholder);
}

async function loadSubtype(content) {
  if (!content?._id) return null;

  if (content.contentType === 'community') {
    return CommunityPost.findOne({ contentId: content._id }).lean();
  }

  if (content.contentType === 'property') {
    return PropertyListing.findOne({ contentId: content._id })
      .populate('galleryMediaIds', 'url secureUrl altText width height resourceType')
      .lean();
  }

  if (content.contentType === 'job') {
    return JobPost.findOne({ contentId: content._id }).lean();
  }

  return null;
}

function previewReady(content, body, subtype) {
  if (!meaningfulTitle(content)) return false;

  const bodyText = String(body?.bodyText || '').trim();
  if (!bodyText) return false;

  if (content.contentType === 'community') {
    return Boolean(subtype?.postType);
  }

  if (content.contentType === 'property') {
    return Boolean(
      subtype?.propertyType &&
        subtype?.addressText &&
        subtype?.contactName &&
        subtype?.contactPhone &&
        Number(subtype?.landArea) > 0 &&
        content.thumbnailMediaId,
    );
  }

  if (content.contentType === 'job') {
    return Boolean(
      subtype?.jobType &&
        subtype?.companyName &&
        subtype?.workLocation &&
        subtype?.deadline,
    );
  }

  return false;
}

export async function createDraft(userId, { contentType }) {
  if (!PLACEHOLDER_TITLES[contentType]) {
    throw new ApiError(
      422,
      'Loại nội dung không hỗ trợ Content Studio.',
      'DRAFT_CONTENT_TYPE_UNSUPPORTED',
    );
  }

  return createContentWithBody({
    authorId: userId,
    contentType,
    title: PLACEHOLDER_TITLES[contentType],
    summary: '',
    bodyHtml: '',
    status: 'draft',
    visibility: 'public',
    allowComments: true,
  });
}

export async function draftDetail(id, userId) {
  const content = await getOwnedContentOrThrow(id, userId);

  if (!PLACEHOLDER_TITLES[content.contentType]) {
    throw new ApiError(
      422,
      'Nội dung này không thuộc Content Studio dành cho thành viên.',
      'DRAFT_CONTENT_TYPE_UNSUPPORTED',
    );
  }

  await content.populate([
    { path: 'authorId', select: 'username displayName' },
    { path: 'primaryCategoryId', select: 'name slug contentScope description' },
    { path: 'primaryAreaId', select: 'name slug areaType description' },
    { path: 'tagIds', select: 'name slug' },
    { path: 'thumbnailMediaId', select: 'url secureUrl altText width height resourceType status' },
  ]);

  const [body, subtype, lastModeration] = await Promise.all([
    ContentBody.findOne({ contentId: content._id }).lean(),
    loadSubtype(content),
    ModerationAction.findOne({
      targetType: 'content',
      targetId: content._id,
      actionType: { $in: ['request_revision', 'reject'] },
    })
      .sort({ createdAt: -1 })
      .populate('performedBy', 'username displayName')
      .lean(),
  ]);

  return {
    ...plain(content),
    body: body || null,
    subtype,
    previewReady: previewReady(content, body, subtype),
    lastModeration: lastModeration || null,
  };
}

export async function removeDraft(id, userId) {
  const content = await getOwnedContentOrThrow(id, userId);

  if (!EDITABLE_STATUSES.has(content.status)) {
    throw new ApiError(
      409,
      'Chỉ nội dung nháp, cần sửa hoặc bị từ chối mới có thể xóa tại đây.',
      'DRAFT_DELETE_NOT_ALLOWED',
      { currentStatus: content.status },
    );
  }

  content.status = 'deleted';
  content.deletedAt = new Date();
  await content.save();

  return { id: String(content._id), deleted: true };
}

export function placeholderTitleFor(contentType) {
  return PLACEHOLDER_TITLES[contentType] || '';
}
