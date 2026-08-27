import Report from '../modules/reports/report.model.js';
import ModerationAction from '../modules/moderation/moderationAction.model.js';
import UserViolation from '../modules/moderation/userViolation.model.js';
import ContentDuplicate from '../modules/moderation/contentDuplicate.model.js';

export async function seedModeration({ users, articles, community, properties }) {
  const reportTarget = community['phan-anh-ngap-sau-mua-ha-bang-27-08'];
  await Report.findOneAndUpdate(
    { reporterId: users.member._id, targetType: 'content', targetId: reportTarget._id, status: 'pending' },
    {
      $set: {
        reason: 'false_information',
        description: 'Yêu cầu kiểm tra lại thời gian và vị trí phản ánh.',
        assignedTo: users.moderator._id,
      },
    },
    { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true },
  );

  const propertyTarget = properties['ban-dat-nen-binh-yen-100m2']?.content;
  if (propertyTarget) {
    await Report.findOneAndUpdate(
      { reporterId: users.resident._id, targetType: 'property', targetId: propertyTarget._id, status: 'reviewing' },
      {
        $set: {
          reason: 'wrong_category',
          description: 'Cần kiểm tra lại thông tin loại đất.',
          assignedTo: users.moderator._id,
        },
      },
      { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true },
    );
  }

  await ModerationAction.findOneAndUpdate(
    { targetType: 'content', targetId: reportTarget._id, actionType: 'approve' },
    {
      $set: {
        reasonCode: 'verified_seed_content',
        note: 'Đã kiểm tra dữ liệu mẫu và cho phép hiển thị.',
        performedBy: users.moderator._id,
      },
    },
    { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true },
  );

  await UserViolation.findOneAndUpdate(
    { userId: users.member._id, violationType: 'excessive_links' },
    {
      $set: {
        severity: 'low',
        relatedTargetType: 'content',
        relatedTargetId: reportTarget._id,
        note: 'Cảnh báo mẫu về việc đăng quá nhiều liên kết.',
        expiresAt: null,
        createdBy: users.moderator._id,
      },
    },
    { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true },
  );

  const first = articles['tong-quan-quy-hoach-hoa-lac'];
  const second = articles['thi-truong-nha-dat-hoa-lac-nhin-tu-nhu-cau-thuc'];
  await ContentDuplicate.findOneAndUpdate(
    { contentId: first._id, matchedContentId: second._id },
    { $set: { similarityScore: 0.32, status: 'dismissed', reviewedBy: users.moderator._id } },
    { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true },
  );
}
