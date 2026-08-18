import Reaction from './reaction.model.js';
import Content from '../contents/content.model.js';
import Comment from '../comments/comment.model.js';
import { createNotification } from '../../services/notification.service.js';
import { NOTIFICATION_TYPES } from '../../constants/notificationTypes.js';
import ApiError from '../../utils/ApiError.js';

async function targetInfo(type, id) {
  if (type === 'content') {
    const target = await Content.findOne({ _id: id, deletedAt: null });

    if (!target) {
      throw new ApiError(404, 'Không tìm thấy nội dung.', 'TARGET_NOT_FOUND');
    }

    return {
      model: Content,
      target,
      ownerId: target.authorId,
      countField: 'reactionCount',
      content: target,
    };
  }

  const target = await Comment.findOne({ _id: id, deletedAt: null });

  if (!target) {
    throw new ApiError(404, 'Không tìm thấy bình luận.', 'TARGET_NOT_FOUND');
  }

  const content = await Content.findOne({
    _id: target.contentId,
    deletedAt: null,
  })
    .select('_id contentType slug')
    .lean();

  return {
    model: Comment,
    target,
    ownerId: target.userId,
    countField: 'reactionCount',
    content,
  };
}

export async function put(userId, type, id, reactionType) {
  const info = await targetInfo(type, id);
  const old = await Reaction.findOne({
    userId,
    targetType: type,
    targetId: id,
  });

  if (old) {
    old.reactionType = reactionType;
    await old.save();
    return old;
  }

  const reaction = await Reaction.create({
    userId,
    targetType: type,
    targetId: id,
    reactionType,
  });

  await info.model.updateOne(
    { _id: id },
    { $inc: { [info.countField]: 1 } },
  );

  await createNotification({
    recipientId: info.ownerId,
    actorId: userId,
    notificationType: NOTIFICATION_TYPES.NEW_REACTION,
    targetType: type,
    targetId: id,
    title:
      type === 'comment'
        ? 'Có người bày tỏ cảm xúc với bình luận của bạn'
        : 'Có người bày tỏ cảm xúc với nội dung của bạn',
    payload: {
      reactionType,
      contentId: info.content?._id || null,
      contentType: info.content?.contentType || '',
      slug: info.content?.slug || '',
    },
  });

  return reaction;
}

export async function remove(userId, type, id) {
  const old = await Reaction.findOneAndDelete({
    userId,
    targetType: type,
    targetId: id,
  });

  if (!old) return null;

  const info = await targetInfo(type, id);

  await info.model.updateOne(
    { _id: id },
    { $inc: { [info.countField]: -1 } },
  );

  return old;
}
