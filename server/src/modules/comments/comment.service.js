import Comment from './comment.model.js';
import Content from '../contents/content.model.js';
import { createNotification } from '../../services/notification.service.js';
import { NOTIFICATION_TYPES } from '../../constants/notificationTypes.js';
import { parsePagination, buildPaginationMeta } from '../../utils/pagination.js';
import ApiError from '../../utils/ApiError.js';

export async function list(contentId, query) {
  const { page, limit, skip } = parsePagination(query, { limit: 30 });
  const sort =
    query.sort === 'oldest'
      ? { createdAt: 1 }
      : query.sort === 'popular'
        ? { reactionCount: -1, createdAt: -1 }
        : { createdAt: -1 };
  const filter = { contentId, parentId: null, status: 'published', deletedAt: null };
  const [items, total] = await Promise.all([
    Comment.find(filter)
      .populate('userId', 'username displayName emailVerifiedAt phoneVerifiedAt')
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(),
    Comment.countDocuments(filter),
  ]);
  const roots = items.map((i) => i._id);
  const replies = roots.length
    ? await Comment.find({ parentId: { $in: roots }, status: 'published', deletedAt: null })
        .populate('userId', 'username displayName')
        .sort({ createdAt: 1 })
        .lean()
    : [];
  const grouped = new Map();
  for (const reply of replies) {
    const key = String(reply.parentId);
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(reply);
  }
  return {
    items: items.map((item) => ({ ...item, replies: grouped.get(String(item._id)) || [] })),
    meta: buildPaginationMeta({ page, limit, total }),
  };
}
export async function create(userId, contentId, data) {
  const content = await Content.findOne({ _id: contentId, status: 'published', deletedAt: null });
  if (!content) throw new ApiError(404, 'Không tìm thấy nội dung.', 'CONTENT_NOT_FOUND');
  if (!content.allowComments)
    throw new ApiError(403, 'Bài viết đã tắt bình luận.', 'COMMENTS_DISABLED');
  let parent = null;
  if (data.parentId) {
    parent = await Comment.findOne({
      _id: data.parentId,
      contentId,
      status: 'published',
      deletedAt: null,
    });
    if (!parent)
      throw new ApiError(404, 'Không tìm thấy bình luận cha.', 'PARENT_COMMENT_NOT_FOUND');
    if (parent.parentId)
      throw new ApiError(422, 'Chỉ hỗ trợ bình luận tối đa hai cấp.', 'COMMENT_DEPTH_LIMIT');
  }
  const comment = await Comment.create({
    contentId,
    userId,
    parentId: data.parentId ?? null,
    body: data.body,
  });
  await Content.updateOne({ _id: contentId }, { $inc: { commentCount: 1 } });
  const recipient = parent?.userId ?? content.authorId;
  await createNotification({
    recipientId: recipient,
    actorId: userId,
    notificationType: parent ? NOTIFICATION_TYPES.COMMENT_REPLY : NOTIFICATION_TYPES.NEW_COMMENT,
    targetType: 'comment',
    targetId: comment._id,
    title: parent ? 'Có người trả lời bình luận của bạn' : 'Bài viết của bạn có bình luận mới',
    message: data.body.slice(0, 160),
    payload: { contentId },
  });
  return comment;
}
export async function update(userId, id, body, isModerator = false) {
  const c = await Comment.findOne({ _id: id, deletedAt: null });
  if (!c) throw new ApiError(404, 'Không tìm thấy bình luận.', 'COMMENT_NOT_FOUND');
  if (String(c.userId) !== String(userId) && !isModerator)
    throw new ApiError(403, 'Bạn không được sửa bình luận này.', 'COMMENT_FORBIDDEN');
  c.body = body;
  c.editedAt = new Date();
  await c.save();
  return c;
}
export async function remove(userId, id, isModerator = false) {
  const c = await Comment.findOne({ _id: id, deletedAt: null });
  if (!c) throw new ApiError(404, 'Không tìm thấy bình luận.', 'COMMENT_NOT_FOUND');
  if (String(c.userId) !== String(userId) && !isModerator)
    throw new ApiError(403, 'Bạn không được xóa bình luận này.', 'COMMENT_FORBIDDEN');
  c.status = 'deleted';
  c.deletedAt = new Date();
  c.body = '[Bình luận đã bị xóa]';
  await c.save();
  await Content.updateOne({ _id: c.contentId }, { $inc: { commentCount: -1 } });
  return c;
}
