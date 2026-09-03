import Comment from './comment.model.js';
import Content from '../contents/content.model.js';
import Media from '../media/media.model.js';
import Reaction from '../reactions/reaction.model.js';
import UserProfile from '../users/userProfile.model.js';
import { createNotification } from '../../services/notification.service.js';
import { NOTIFICATION_TYPES } from '../../constants/notificationTypes.js';
import { parsePagination, buildPaginationMeta } from '../../utils/pagination.js';
import ApiError from '../../utils/ApiError.js';

async function loadAvatarProfiles(userIds = []) {
  const uniqueIds = [...new Set(userIds.filter(Boolean).map(String))];
  if (!uniqueIds.length) return new Map();

  const profiles = await UserProfile.find({
    userId: { $in: uniqueIds },
  })
    .select('userId avatarMediaId')
    .populate('avatarMediaId', 'url secureUrl altText width height')
    .lean();

  return new Map(
    profiles.map((profile) => [String(profile.userId), profile]),
  );
}

function attachProfile(user, profileMap) {
  if (!user) return user;

  const plain = typeof user.toObject === 'function' ? user.toObject() : user;

  return {
    ...plain,
    profile: profileMap.get(String(plain._id || plain.id)) || null,
  };
}

export async function list(contentId, query, viewerId = null) {
  const { page, limit, skip } = parsePagination(query, { limit: 30 });
  const sort =
    query.sort === 'oldest'
      ? { createdAt: 1 }
      : query.sort === 'popular'
        ? { reactionCount: -1, createdAt: -1 }
        : { createdAt: -1 };

  const filter = {
    contentId,
    parentId: null,
    status: 'published',
    deletedAt: null,
  };

  const mediaFields =
    'url secureUrl altText width height format resourceType originalFilename';

  const [items, total] = await Promise.all([
    Comment.find(filter)
      .populate(
        'userId',
        'username displayName emailVerifiedAt phoneVerifiedAt',
      )
      .populate('mediaId', mediaFields)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(),
    Comment.countDocuments(filter),
  ]);

  const roots = items.map((item) => item._id);
  const replies = roots.length
    ? await Comment.find({
        parentId: { $in: roots },
        status: 'published',
        deletedAt: null,
      })
        .populate(
          'userId',
          'username displayName emailVerifiedAt phoneVerifiedAt',
        )
        .populate('mediaId', mediaFields)
        .sort({ createdAt: 1 })
        .lean()
    : [];

  const allComments = [...items, ...replies];
  const profileMap = await loadAvatarProfiles(
    allComments.map((comment) => comment.userId?._id),
  );

  const viewerReactions =
    viewerId && allComments.length
      ? await Reaction.find({
          userId: viewerId,
          targetType: 'comment',
          targetId: { $in: allComments.map((comment) => comment._id) },
        })
          .select('targetId reactionType')
          .lean()
      : [];

  const reactionMap = new Map(
    viewerReactions.map((reaction) => [
      String(reaction.targetId),
      reaction.reactionType,
    ]),
  );

  const hydrate = (comment) => ({
    ...comment,
    userId: attachProfile(comment.userId, profileMap),
    viewerReaction: reactionMap.get(String(comment._id)) || null,
  });

  const grouped = new Map();
  for (const reply of replies) {
    const key = String(reply.parentId);
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(hydrate(reply));
  }

  return {
    items: items.map((item) => ({
      ...hydrate(item),
      replies: grouped.get(String(item._id)) || [],
    })),
    meta: buildPaginationMeta({ page, limit, total }),
  };
}

export async function create(userId, contentId, data) {
  const content = await Content.findOne({
    _id: contentId,
    status: 'published',
    deletedAt: null,
  });

  if (!content) {
    throw new ApiError(404, 'Không tìm thấy nội dung.', 'CONTENT_NOT_FOUND');
  }

  if (!content.allowComments) {
    throw new ApiError(403, 'Bài viết đã tắt bình luận.', 'COMMENTS_DISABLED');
  }

  let parent = null;
  if (data.parentId) {
    parent = await Comment.findOne({
      _id: data.parentId,
      contentId,
      status: 'published',
      deletedAt: null,
    });

    if (!parent) {
      throw new ApiError(404, 'Không tìm thấy bình luận cha.', 'PARENT_COMMENT_NOT_FOUND');
    }

    if (parent.parentId) {
      throw new ApiError(422, 'Chỉ hỗ trợ bình luận tối đa hai cấp.', 'COMMENT_DEPTH_LIMIT');
    }
  }

  let mediaId = null;
  if (data.mediaId) {
    const media = await Media.findOne({
      _id: data.mediaId,
      ownerId: userId,
      status: 'active',
      resourceType: 'image',
    }).select('_id');

    if (!media) {
      throw new ApiError(
        422,
        'Ảnh/GIF đính kèm không hợp lệ hoặc không thuộc tài khoản của bạn.',
        'COMMENT_MEDIA_INVALID',
      );
    }

    mediaId = media._id;
  }

  const body = String(data.body || '').trim();

  const comment = await Comment.create({
    contentId,
    userId,
    parentId: data.parentId ?? null,
    body,
    mediaId,
  });

  await Content.updateOne(
    { _id: contentId },
    { $inc: { commentCount: 1 } },
  );

  const recipient = parent?.userId ?? content.authorId;
  const notificationMessage = body
    ? body.slice(0, 160)
    : '[Đã gửi một ảnh/GIF]';

  await createNotification({
    recipientId: recipient,
    actorId: userId,
    notificationType: parent
      ? NOTIFICATION_TYPES.COMMENT_REPLY
      : NOTIFICATION_TYPES.NEW_COMMENT,
    targetType: 'comment',
    targetId: comment._id,
    title: parent
      ? 'Có người trả lời bình luận của bạn'
      : 'Bài viết của bạn có bình luận mới',
    message: notificationMessage,
    payload: {
      contentId: content._id,
      contentType: content.contentType,
      slug: content.slug,
    },
  });

  return Comment.findById(comment._id)
    .populate('mediaId', mediaFieldsForComment())
    .lean();
}

function mediaFieldsForComment() {
  return 'url secureUrl altText width height format resourceType originalFilename';
}

export async function update(userId, id, body, isModerator = false) {
  const comment = await Comment.findOne({ _id: id, deletedAt: null });

  if (!comment) {
    throw new ApiError(404, 'Không tìm thấy bình luận.', 'COMMENT_NOT_FOUND');
  }

  if (String(comment.userId) !== String(userId) && !isModerator) {
    throw new ApiError(403, 'Bạn không được sửa bình luận này.', 'COMMENT_FORBIDDEN');
  }

  comment.body = body;
  comment.editedAt = new Date();
  await comment.save();
  return comment;
}

export async function remove(userId, id, isModerator = false) {
  const comment = await Comment.findOne({ _id: id, deletedAt: null });

  if (!comment) {
    throw new ApiError(404, 'Không tìm thấy bình luận.', 'COMMENT_NOT_FOUND');
  }

  if (String(comment.userId) !== String(userId) && !isModerator) {
    throw new ApiError(403, 'Bạn không được xóa bình luận này.', 'COMMENT_FORBIDDEN');
  }

  comment.status = 'deleted';
  comment.deletedAt = new Date();
  comment.body = '[Bình luận đã bị xóa]';
  comment.mediaId = null;
  await comment.save();

  await Content.updateOne(
    { _id: comment.contentId },
    { $inc: { commentCount: -1 } },
  );

  return comment;
}
