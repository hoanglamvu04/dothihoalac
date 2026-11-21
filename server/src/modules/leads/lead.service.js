import LeadRequest from './leadRequest.model.js';
import LeadActivity from './leadActivity.model.js';
import LeadAssignment from './leadAssignment.model.js';
import ReferralEvent from './referralEvent.model.js';
import { normalizePhone, isVietnamesePhone } from '../../utils/normalizePhone.js';
import { parsePagination, buildPaginationMeta } from '../../utils/pagination.js';
import ApiError from '../../utils/ApiError.js';
import { normalizeLeadFollowUp, overdueLeadFilter } from './leadFollowUp.js';
export async function create(userId, d) {
  const phone = normalizePhone(d.phone);
  if (!isVietnamesePhone(phone))
    throw new ApiError(422, 'Số điện thoại không hợp lệ.', 'PHONE_INVALID');
  const payload = { ...d };
  delete payload.consent;
  return LeadRequest.create({ ...payload, userId, phone, consentAt: new Date() });
}
export async function referral(userId, d) {
  return ReferralEvent.create({ ...d, userId });
}
export async function adminList(q) {
  const { page, limit, skip } = parsePagination(q);
  const f = {};
  if (q.status) f.status = q.status;
  if (q.brand) f.assignedBrand = q.brand;
  if (q.type) f.leadType = q.type;
  if (q.followUp === 'overdue') {
    Object.assign(f, overdueLeadFilter());
    if (q.status) f.status = q.status;
  }
  const [items, total] = await Promise.all([
    LeadRequest.find(f)
      .populate('userId', 'username displayName')
      .populate('areaId', 'name slug')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    LeadRequest.countDocuments(f),
  ]);
  return { items, meta: buildPaginationMeta({ page, limit, total }) };
}
export async function adminOverview() {
  const sinceSevenDays = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const [total, recent, due, statuses, brands] = await Promise.all([
    LeadRequest.countDocuments({}),
    LeadRequest.countDocuments({ createdAt: { $gte: sinceSevenDays } }),
    LeadRequest.countDocuments(overdueLeadFilter()),
    LeadRequest.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    LeadRequest.aggregate([{ $group: { _id: '$assignedBrand', count: { $sum: 1 } } }]),
  ]);

  const byStatus = Object.fromEntries(statuses.map((row) => [row._id, row.count]));
  const byBrand = Object.fromEntries(brands.map((row) => [row._id, row.count]));
  return {
    total,
    newLast7Days: recent,
    overdueFollowUps: due,
    won: Number(byStatus.won || 0),
    byStatus,
    byBrand,
    generatedAt: new Date().toISOString(),
  };
}

export async function adminUpdate(id, adminId, d) {
  const lead = await LeadRequest.findById(id);
  if (!lead) throw new ApiError(404, 'Không tìm thấy khách hàng tiềm năng.', 'LEAD_NOT_FOUND');
  if (d.status) lead.status = d.status;
  if (d.assignedBrand) lead.assignedBrand = d.assignedBrand;
  if (d.nextFollowUpAt !== undefined) {
    try {
      lead.nextFollowUpAt = normalizeLeadFollowUp(d.nextFollowUpAt);
    } catch {
      throw new ApiError(422, 'Thời gian nhắc lại không hợp lệ.', 'LEAD_FOLLOW_UP_INVALID');
    }
  }
  await lead.save();
  if (d.assignedTo) {
    await LeadAssignment.updateMany({ leadId: id, endedAt: null }, { endedAt: new Date() });
    await LeadAssignment.create({ leadId: id, assignedTo: d.assignedTo, assignedBy: adminId });
  }
  if (d.activityType || d.note || d.nextFollowUpAt !== undefined)
    await LeadActivity.create({
      leadId: id,
      activityType: d.activityType || 'admin_update',
      note: d.note || (d.nextFollowUpAt === null || d.nextFollowUpAt === ''
        ? 'Đã hủy lịch nhắc lại.'
        : d.nextFollowUpAt ? 'Đặt lịch nhắc lại.' : ''),
      performedBy: adminId,
    });
  return lead;
}
export async function detail(id) {
  const lead = await LeadRequest.findById(id).populate('userId', 'username displayName').lean();
  if (!lead) throw new ApiError(404, 'Không tìm thấy lead.', 'LEAD_NOT_FOUND');
  const [activities, assignments] = await Promise.all([
    LeadActivity.find({ leadId: id })
      .populate('performedBy', 'username displayName')
      .sort({ createdAt: -1 })
      .lean(),
    LeadAssignment.find({ leadId: id })
      .populate('assignedTo assignedBy', 'username displayName')
      .sort({ assignedAt: -1 })
      .lean(),
  ]);
  return { ...lead, activities, assignments };
}
