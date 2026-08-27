import Notification from '../modules/notifications/notification.model.js';
import NotificationPreference from '../modules/notifications/notificationPreference.model.js';
import { NOTIFICATION_TYPES } from '../constants/notificationTypes.js';

export async function seedNotifications({ users, articles, community }) {
  const specs = [
    [users.resident, users.editor, 'new_comment', community['phan-anh-ngap-sau-mua-ha-bang-27-08'], 'Có bình luận mới', 'Một thành viên vừa bình luận vào bài phản ánh của bạn.'],
    [users.student, users.editor, 'post_approved', community['hoi-xe-buyt-hoa-lac-trung-tam-27-08'], 'Bài viết đã được duyệt', 'Bài hỏi đáp của bạn đã được xuất bản.'],
    [users.member, users.moderator, 'system_notice', null, 'Chào mừng đến Đô Thị Hòa Lạc', 'Hãy hoàn thiện hồ sơ và xác thực tài khoản để tăng độ tin cậy.'],
    [users.editor, users.chiefEditor, 'new_reaction', articles['tong-quan-quy-hoach-hoa-lac'], 'Bài viết được quan tâm', 'Bài viết quy hoạch đang nhận nhiều tương tác.'],
  ];

  for (const [recipient, actor, notificationType, target, title, message] of specs) {
    await Notification.findOneAndUpdate(
      { recipientId: recipient._id, notificationType, title },
      {
        $set: {
          actorId: actor?._id || null,
          targetType: target ? 'content' : '',
          targetId: target?._id || null,
          message,
          payload: target ? { slug: target.slug } : {},
          readAt: notificationType === 'new_reaction' ? new Date() : null,
          deletedAt: null,
        },
      },
      { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true },
    );
  }

  const preferenceUsers = [users.resident, users.student, users.member];
  for (const user of preferenceUsers) {
    for (const notificationType of Object.values(NOTIFICATION_TYPES)) {
      await NotificationPreference.findOneAndUpdate(
        { userId: user._id, notificationType },
        {
          $set: {
            inAppEnabled: true,
            emailEnabled: ['post_approved', 'post_rejected', 'account_warning'].includes(notificationType),
            smsEnabled: false,
          },
        },
        { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true },
      );
    }
  }
}
