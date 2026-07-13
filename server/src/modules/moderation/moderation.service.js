import Content from '../contents/content.model.js';
import User from '../users/user.model.js';
import Report from '../reports/report.model.js';
import ModerationAction from './moderationAction.model.js';
import UserViolation from './userViolation.model.js';
import LeadRequest from '../leads/leadRequest.model.js';
import Comment from '../comments/comment.model.js';
import { createNotification } from '../../services/notification.service.js';
import { NOTIFICATION_TYPES } from '../../constants/notificationTypes.js';
import { writeAuditLog } from '../../services/audit.service.js';
import { parsePagination, buildPaginationMeta } from '../../utils/pagination.js';
import ApiError from '../../utils/ApiError.js';
const transitionMap = {
  approve: 'approved',
  request_revision: 'needs_revision',
  reject: 'rejected',
  hide: 'hidden',
  restore: 'published',
};
export async function dashboard() {
  const [userCount, pendingContent, pendingReports, newLeads, comments] = await Promise.all([
    User.countDocuments({ deletedAt: null }),
    Content.countDocuments({ status: 'pending_review', deletedAt: null }),
    Report.countDocuments({ status: 'pending' }),
    LeadRequest.countDocuments({ status: 'new' }),
    Comment.countDocuments({ status: 'published' }),
  ]);
  return { userCount, pendingContent, pendingReports, newLeads, comments };
}
export async function queue(q) {
  const { page, limit, skip } = parsePagination(q);
  const f = { status: 'pending_review', deletedAt: null };
  if (q.type) f.contentType = q.type;
  const [items, total] = await Promise.all([
    Content.find(f)
      .populate('authorId', 'username displayName emailVerifiedAt phoneVerifiedAt status')
      .sort({ createdAt: 1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Content.countDocuments(f),
  ]);
  return { items, meta: buildPaginationMeta({ page, limit, total }) };
}
export async function action(admin, contentId, actionType, data, ip) {
  const content = await Content.findById(contentId);
  if (!content) throw new ApiError(404, 'Không tìm thấy nội dung.', 'CONTENT_NOT_FOUND');
  const oldStatus = content.status;
  const next = transitionMap[actionType];
  if (!next)
    throw new ApiError(422, 'Hành động kiểm duyệt không hợp lệ.', 'MODERATION_ACTION_INVALID');
  content.status = next;
  if (actionType === 'approve' && data.publishNow) {
    content.status = 'published';
    content.publishedAt = new Date();
  }
  if (actionType === 'restore' && !content.publishedAt) content.publishedAt = new Date();
  await content.save();
  await ModerationAction.create({
    targetType: 'content',
    targetId: contentId,
    actionType,
    reasonCode: data.reasonCode || '',
    note: data.note || '',
    performedBy: admin._id,
  });
  const notificationType =
    actionType === 'approve'
      ? NOTIFICATION_TYPES.POST_APPROVED
      : actionType === 'reject'
        ? NOTIFICATION_TYPES.POST_REJECTED
        : actionType === 'request_revision'
          ? NOTIFICATION_TYPES.POST_NEEDS_REVISION
          : NOTIFICATION_TYPES.SYSTEM_NOTICE;
  await createNotification({
    recipientId: content.authorId,
    actorId: admin._id,
    notificationType,
    targetType: 'content',
    targetId: contentId,
    title: data.note || `Trạng thái bài viết đã đổi thành ${content.status}`,
    payload: { oldStatus, newStatus: content.status },
  });
  await writeAuditLog({
    adminId: admin._id,
    action: `content.${actionType}`,
    targetType: 'content',
    targetId: contentId,
    oldData: { status: oldStatus },
    newData: { status: content.status },
    ipAddress: ip,
  });
  return content;
}
export async function users(q) {
  const { page, limit, skip } = parsePagination(q);
  const f = { deletedAt: null };
  if (q.status) f.status = q.status;
  if (q.q)
    f.$or = [
      { email: new RegExp(q.q, 'i') },
      { username: new RegExp(q.q, 'i') },
      { displayName: new RegExp(q.q, 'i') },
    ];
  const [items, total] = await Promise.all([
    User.find(f).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    User.countDocuments(f),
  ]);
  return { items, meta: buildPaginationMeta({ page, limit, total }) };
}
export async function updateUserStatus(admin, userId, d, ip) {
  const user = await User.findById(userId);
  if (!user) throw new ApiError(404, 'Không tìm thấy người dùng.', 'USER_NOT_FOUND');
  const old = user.status;
  user.status = d.status;
  await user.save();
  if (d.violationType)
    await UserViolation.create({
      userId,
      violationType: d.violationType,
      severity: d.severity || 'medium',
      note: d.note || '',
      createdBy: admin._id,
    });
  await createNotification({
    recipientId: userId,
    actorId: admin._id,
    notificationType: NOTIFICATION_TYPES.ACCOUNT_WARNING,
    targetType: 'user',
    targetId: userId,
    title: d.note || `Trạng thái tài khoản: ${d.status}`,
  });
  await writeAuditLog({
    adminId: admin._id,
    action: 'user.status',
    targetType: 'user',
    targetId: userId,
    oldData: { status: old },
    newData: { status: d.status },
    ipAddress: ip,
  });
  return user;
}
export async function reports(q) {
  const { page, limit, skip } = parsePagination(q);
  const f = {};
  if (q.status) f.status = q.status;
  const [items, total] = await Promise.all([
    Report.find(f)
      .populate('reporterId assignedTo resolvedBy', 'username displayName')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Report.countDocuments(f),
  ]);
  return { items, meta: buildPaginationMeta({ page, limit, total }) };
}
export async function resolveReport(admin, id, d) {
  const report = await Report.findById(id);
  if (!report) throw new ApiError(404, 'Không tìm thấy báo cáo.', 'REPORT_NOT_FOUND');
  report.status = d.status;
  report.resolutionNote = d.resolutionNote || '';
  report.resolvedBy = admin._id;
  report.resolvedAt = new Date();
  await report.save();
  await createNotification({
    recipientId: report.reporterId,
    actorId: admin._id,
    notificationType: NOTIFICATION_TYPES.REPORT_RESOLVED,
    targetType: 'report',
    targetId: report._id,
    title: 'Báo cáo của bạn đã được xử lý',
    message: report.resolutionNote,
  });
  return report;
}
