import Reaction from './reaction.model.js';
import Content from '../contents/content.model.js';
import Comment from '../comments/comment.model.js';
import { createNotification } from '../../services/notification.service.js';
import { NOTIFICATION_TYPES } from '../../constants/notificationTypes.js';
import ApiError from '../../utils/ApiError.js';
async function targetInfo(type, id) {
  if (type === 'content') {
    const t = await Content.findOne({ _id: id, deletedAt: null });
    if (!t) throw new ApiError(404, 'Không tìm thấy nội dung.', 'TARGET_NOT_FOUND');
    return { model: Content, target: t, ownerId: t.authorId, countField: 'reactionCount' };
  }
  const t = await Comment.findOne({ _id: id, deletedAt: null });
  if (!t) throw new ApiError(404, 'Không tìm thấy bình luận.', 'TARGET_NOT_FOUND');
  return { model: Comment, target: t, ownerId: t.userId, countField: 'reactionCount' };
}
export async function put(userId, type, id, reactionType) {
  const info = await targetInfo(type, id);
  const old = await Reaction.findOne({ userId, targetType: type, targetId: id });
  if (old) {
    old.reactionType = reactionType;
    await old.save();
    return old;
  }
  const reaction = await Reaction.create({ userId, targetType: type, targetId: id, reactionType });
  await info.model.updateOne({ _id: id }, { $inc: { [info.countField]: 1 } });
  await createNotification({
    recipientId: info.ownerId,
    actorId: userId,
    notificationType: NOTIFICATION_TYPES.NEW_REACTION,
    targetType: type,
    targetId: id,
    title: 'Có người bày tỏ cảm xúc với nội dung của bạn',
    payload: { reactionType },
  });
  return reaction;
}
export async function remove(userId, type, id) {
  const old = await Reaction.findOneAndDelete({ userId, targetType: type, targetId: id });
  if (!old) return null;
  const info = await targetInfo(type, id);
  await info.model.updateOne({ _id: id }, { $inc: { [info.countField]: -1 } });
  return old;
}
