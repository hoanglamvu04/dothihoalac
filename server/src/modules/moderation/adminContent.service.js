import Content from '../contents/content.model.js';
import ContentBody from '../contents/contentBody.model.js';
import CommunityPost from '../community/communityPost.model.js';
import PropertyListing from '../properties/propertyListing.model.js';
import JobPost from '../jobs/jobPost.model.js';
import Comment from '../comments/comment.model.js';
import { updateContentWithBody } from '../contents/content.service.js';
import { parsePagination, buildPaginationMeta } from '../../utils/pagination.js';
import { writeAuditLog } from '../../services/audit.service.js';
import ApiError from '../../utils/ApiError.js';

const MANAGED_TYPES = new Set(['community', 'property', 'job']);
const MANAGED_STATUSES = new Set([
  'draft', 'pending_review', 'needs_revision', 'approved', 'scheduled', 'published',
  'rejected', 'hidden', 'archived', 'expired', 'deleted',
]);
const COMMENT_STATUSES = new Set(['published', 'hidden', 'deleted', 'pending']);

const DETAIL_FIELDS = {
  community: new Set([
    'postType', 'questionStatus', 'acceptedCommentId', 'incidentStatus',
    'incidentTime', 'locationText', 'rating',
  ]),
  property: new Set([
    'transactionType', 'propertyType', 'ownerType', 'price', 'priceUnit',
    'isNegotiable', 'landArea', 'usableArea', 'bedrooms', 'bathrooms', 'frontage',
    'roadWidth', 'direction', 'legalStatus', 'addressText', 'location', 'contactName',
    'contactPhone', 'contactEmail', 'featureIds', 'expiresAt', 'soldAt', 'rentedAt',
  ]),
  job: new Set([
    'jobType', 'companyName', 'salaryMin', 'salaryMax', 'salaryUnit',
    'experienceLevel', 'workLocation', 'applicationMethod', 'contactEmail',
    'contactPhone', 'deadline', 'positionsCount',
  ]),
};

function ensureType(type) {
  if (!MANAGED_TYPES.has(type)) {
    throw new ApiError(422, 'Loại nội dung quản trị không hợp lệ.', 'ADMIN_CONTENT_TYPE_INVALID');
  }
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function pickAllowedDetails(type, input) {
  const result = {};
  const allowed = DETAIL_FIELDS[type];
  if (!input || typeof input !== 'object') return result;
  for (const [key, value] of Object.entries(input)) {
    if (allowed.has(key)) result[key] = value;
  }
  return result;
}

async function attachDetails(items, type) {
  const ids = items.map((item) => item._id);
  if (!ids.length) return items;

  let rows = [];
  let key = '';
  if (type === 'community') {
    rows = await CommunityPost.find({ contentId: { $in: ids } }).lean();
    key = 'community';
  } else if (type === 'property') {
    rows = await PropertyListing.find({ contentId: { $in: ids } }).lean();
    key = 'property';
  } else {
    rows = await JobPost.find({ contentId: { $in: ids } }).lean();
    key = 'job';
  }

  const map = new Map(rows.map((row) => [String(row.contentId), row]));
  return items.map((item) => ({ ...item, [key]: map.get(String(item._id)) || null }));
}

export async function list(type, query) {
  ensureType(type);
  const { page, limit, skip } = parsePagination(query);
  const filter = { contentType: type };

  if (query.status) filter.status = query.status;
  if (query.includeDeleted !== '1' && query.status !== 'deleted') filter.deletedAt = null;
  if (query.q) {
    const regex = new RegExp(escapeRegex(query.q), 'i');
    filter.$or = [{ title: regex }, { summary: regex }];
  }

  const [items, total] = await Promise.all([
    Content.find(filter)
      .populate('authorId', 'username displayName email status')
      .populate('primaryAreaId', 'name slug')
      .populate('primaryCategoryId', 'name slug')
      .populate('thumbnailMediaId', 'url secureUrl altText width height')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Content.countDocuments(filter),
  ]);

  return {
    items: await attachDetails(items, type),
    meta: buildPaginationMeta({ page, limit, total }),
  };
}

export async function detail(type, id) {
  ensureType(type);
  const item = await Content.findOne({ _id: id, contentType: type })
    .populate('authorId', 'username displayName email status emailVerifiedAt phoneVerifiedAt')
    .populate('primaryAreaId', 'name slug')
    .populate('primaryCategoryId', 'name slug')
    .populate('thumbnailMediaId', 'url secureUrl altText width height')
    .lean();

  if (!item) throw new ApiError(404, 'Không tìm thấy nội dung.', 'CONTENT_NOT_FOUND');

  const [withDetail] = await attachDetails([item], type);
  const body = await ContentBody.findOne({ contentId: id }).lean();
  return { ...withDetail, body: body || null };
}

export async function update(admin, type, id, payload, ip) {
  ensureType(type);
  const content = await Content.findOne({ _id: id, contentType: type });
  if (!content) throw new ApiError(404, 'Không tìm thấy nội dung.', 'CONTENT_NOT_FOUND');

  const oldData = {
    title: content.title,
    summary: content.summary,
    visibility: content.visibility,
    allowComments: content.allowComments,
    isFeatured: content.isFeatured,
    isSponsored: content.isSponsored,
  };

  const common = {};
  for (const key of [
    'title', 'summary', 'bodyHtml', 'visibility', 'allowComments', 'primaryCategoryId',
    'primaryAreaId', 'categoryIds', 'tagIds', 'areaIds', 'thumbnailMediaId',
    'isFeatured', 'isSponsored',
  ]) {
    if (payload[key] !== undefined) common[key] = payload[key];
  }

  if (Object.keys(common).length) {
    await updateContentWithBody(content, common, admin._id, 'Admin content edit');
  }

  const details = pickAllowedDetails(type, payload.details);
  if (Object.keys(details).length) {
    const Model = type === 'community' ? CommunityPost : type === 'property' ? PropertyListing : JobPost;
    const updated = await Model.findOneAndUpdate(
      { contentId: id },
      { $set: details },
      { runValidators: true, new: true },
    );
    if (!updated) {
      throw new ApiError(404, 'Không tìm thấy dữ liệu chuyên biệt của nội dung.', 'CONTENT_DETAIL_NOT_FOUND');
    }
  }

  await writeAuditLog({
    adminId: admin._id,
    action: `admin.${type}.update`,
    targetType: 'content',
    targetId: id,
    oldData,
    newData: { ...common, details },
    ipAddress: ip,
  });

  return detail(type, id);
}

export async function setStatus(admin, type, id, status, ip, note = '') {
  ensureType(type);
  if (!MANAGED_STATUSES.has(status)) {
    throw new ApiError(422, 'Trạng thái nội dung không hợp lệ.', 'CONTENT_STATUS_INVALID');
  }

  const content = await Content.findOne({ _id: id, contentType: type });
  if (!content) throw new ApiError(404, 'Không tìm thấy nội dung.', 'CONTENT_NOT_FOUND');

  const oldStatus = content.status;
  content.status = status;
  if (status === 'published' && !content.publishedAt) content.publishedAt = new Date();
  if (status === 'deleted') content.deletedAt = new Date();
  else if (content.deletedAt) content.deletedAt = null;
  await content.save();

  await writeAuditLog({
    adminId: admin._id,
    action: `admin.${type}.status`,
    targetType: 'content',
    targetId: id,
    oldData: { status: oldStatus },
    newData: { status, note },
    ipAddress: ip,
  });

  return detail(type, id);
}

export async function remove(admin, type, id, ip) {
  return setStatus(admin, type, id, 'deleted', ip, 'Admin soft delete');
}

export async function comments(query) {
  const { page, limit, skip } = parsePagination(query, { limit: 30 });
  const filter = {};
  if (query.status) filter.status = query.status;
  if (query.q) filter.body = new RegExp(escapeRegex(query.q), 'i');
  if (query.contentId) filter.contentId = query.contentId;

  const [items, total] = await Promise.all([
    Comment.find(filter)
      .populate('userId', 'username displayName email status')
      .populate('contentId', 'title slug contentType status')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Comment.countDocuments(filter),
  ]);

  return { items, meta: buildPaginationMeta({ page, limit, total }) };
}

export async function updateComment(admin, id, payload, ip) {
  const comment = await Comment.findById(id);
  if (!comment) throw new ApiError(404, 'Không tìm thấy bình luận.', 'COMMENT_NOT_FOUND');

  const oldData = { body: comment.body, status: comment.status };
  if (payload.body !== undefined) {
    const body = String(payload.body).trim();
    if (!body) throw new ApiError(422, 'Bình luận không được để trống.', 'COMMENT_BODY_REQUIRED');
    comment.body = body;
    comment.editedAt = new Date();
  }
  if (payload.status !== undefined) {
    if (!COMMENT_STATUSES.has(payload.status)) {
      throw new ApiError(422, 'Trạng thái bình luận không hợp lệ.', 'COMMENT_STATUS_INVALID');
    }
    comment.status = payload.status;
    if (payload.status === 'deleted') comment.deletedAt = new Date();
    else comment.deletedAt = null;
  }
  await comment.save();

  await writeAuditLog({
    adminId: admin._id,
    action: 'admin.comment.update',
    targetType: 'comment',
    targetId: id,
    oldData,
    newData: payload,
    ipAddress: ip,
  });

  return Comment.findById(id)
    .populate('userId', 'username displayName email status')
    .populate('contentId', 'title slug contentType status')
    .lean();
}

export async function deleteComment(admin, id, ip) {
  const comment = await Comment.findById(id);
  if (!comment) throw new ApiError(404, 'Không tìm thấy bình luận.', 'COMMENT_NOT_FOUND');

  const wasVisible = comment.status !== 'deleted';
  const oldStatus = comment.status;
  comment.status = 'deleted';
  comment.deletedAt = new Date();
  comment.body = '[Bình luận đã bị xóa bởi quản trị viên]';
  await comment.save();

  if (wasVisible) {
    await Content.updateOne(
      { _id: comment.contentId, commentCount: { $gt: 0 } },
      { $inc: { commentCount: -1 } },
    );
  }

  await writeAuditLog({
    adminId: admin._id,
    action: 'admin.comment.delete',
    targetType: 'comment',
    targetId: id,
    oldData: { status: oldStatus },
    newData: { status: 'deleted' },
    ipAddress: ip,
  });

  return comment;
}
