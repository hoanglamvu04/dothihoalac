import Follow from './follow.model.js';
import User from '../users/user.model.js';
import Area from '../taxonomy/area.model.js';
import Category from '../taxonomy/category.model.js';
import Tag from '../taxonomy/tag.model.js';
import Content from '../contents/content.model.js';
import { createNotification } from '../../services/notification.service.js';
import { NOTIFICATION_TYPES } from '../../constants/notificationTypes.js';
import ApiError from '../../utils/ApiError.js';
const models = { user: User, area: Area, category: Category, tag: Tag, content: Content };
export async function put(userId, type, id) {
  if (type === 'user' && String(userId) === String(id))
    throw new ApiError(422, 'Bạn không thể tự theo dõi chính mình.', 'SELF_FOLLOW');
  if (!models[type] || !(await models[type].exists({ _id: id })))
    throw new ApiError(404, 'Không tìm thấy đối tượng theo dõi.', 'FOLLOW_TARGET_NOT_FOUND');
  const f = await Follow.findOneAndUpdate(
    { followerId: userId, targetType: type, targetId: id },
    { $setOnInsert: { followerId: userId, targetType: type, targetId: id } },
    { upsert: true, new: true },
  );
  if (type === 'user')
    await createNotification({
      recipientId: id,
      actorId: userId,
      notificationType: NOTIFICATION_TYPES.NEW_FOLLOWER,
      targetType: 'user',
      targetId: id,
      title: 'Bạn có người theo dõi mới',
    });
  return f;
}
export async function remove(userId, type, id) {
  return Follow.findOneAndDelete({ followerId: userId, targetType: type, targetId: id });
}
export async function list(userId) {
  return Follow.find({ followerId: userId }).sort({ createdAt: -1 }).lean();
}
