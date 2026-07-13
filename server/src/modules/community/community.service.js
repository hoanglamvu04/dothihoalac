import Content from '../contents/content.model.js';
import CommunityPost from './communityPost.model.js';
import Comment from '../comments/comment.model.js';
import {
  createContentWithBody,
  getPublishedContentBySlug,
  getOwnedContentOrThrow,
  assertEditable,
  updateContentWithBody,
} from '../contents/content.service.js';
import { parsePagination, buildPaginationMeta } from '../../utils/pagination.js';
import ApiError from '../../utils/ApiError.js';
export async function list(q) {
  const { page, limit, skip } = parsePagination(q);
  const f = { contentType: 'community', status: 'published', deletedAt: null };
  if (q.area) f.primaryAreaId = q.area;
  if (q.category) f.primaryCategoryId = q.category;
  const detailFilter = {};
  if (q.type) detailFilter.postType = q.type;
  let ids = null;
  if (Object.keys(detailFilter).length)
    ids = (await CommunityPost.find(detailFilter).select('contentId').lean()).map(
      (x) => x.contentId,
    );
  if (ids) f._id = { $in: ids };
  const [items, total] = await Promise.all([
    Content.find(f)
      .populate('authorId', 'username displayName emailVerifiedAt phoneVerifiedAt')
      .populate('primaryAreaId', 'name slug')
      .sort(q.sort === 'popular' ? { reactionCount: -1, commentCount: -1 } : { publishedAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Content.countDocuments(f),
  ]);
  return { items, meta: buildPaginationMeta({ page, limit, total }) };
}
export async function detail(slug) {
  const base = await getPublishedContentBySlug(slug, 'community');
  const community = await CommunityPost.findOne({ contentId: base._id }).lean();
  return { ...base, community };
}
export async function create(userId, d) {
  const c = await createContentWithBody({
    authorId: userId,
    contentType: 'community',
    ...d,
    status: 'draft',
  });
  await CommunityPost.create({
    contentId: c._id,
    postType: d.postType,
    incidentTime: d.incidentTime,
    locationText: d.locationText,
    rating: d.rating,
  });
  return c;
}
export async function update(id, userId, d) {
  const c = await getOwnedContentOrThrow(id, userId, 'community');
  assertEditable(c);
  await updateContentWithBody(c, d, userId, 'User edit');
  await CommunityPost.findOneAndUpdate({ contentId: id }, d, { new: true });
  return c;
}
export async function remove(id, userId) {
  const content = await getOwnedContentOrThrow(id, userId, 'community');
  content.status = 'deleted';
  content.deletedAt = new Date();
  await content.save();
}
export async function submit(id, userId) {
  const c = await getOwnedContentOrThrow(id, userId, 'community');
  if (!['draft', 'needs_revision', 'rejected'].includes(c.status))
    throw new ApiError(409, 'Bài không thể gửi duyệt.', 'INVALID_STATUS');
  c.status = 'pending_review';
  await c.save();
  return c;
}
export async function acceptAnswer(id, userId, commentId) {
  const _content = await getOwnedContentOrThrow(id, userId, 'community');
  const post = await CommunityPost.findOne({ contentId: id, postType: 'question' });
  if (!post) throw new ApiError(400, 'Chỉ bài hỏi đáp mới chọn được câu trả lời.', 'NOT_QUESTION');
  const comment = await Comment.findOne({ _id: commentId, contentId: id, status: 'published' });
  if (!comment) throw new ApiError(404, 'Không tìm thấy bình luận.', 'COMMENT_NOT_FOUND');
  post.acceptedCommentId = commentId;
  post.questionStatus = 'answered';
  await post.save();
  return post;
}
