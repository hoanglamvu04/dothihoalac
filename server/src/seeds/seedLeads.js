import LeadRequest from '../modules/leads/leadRequest.model.js';
import LeadAssignment from '../modules/leads/leadAssignment.model.js';
import LeadActivity from '../modules/leads/leadActivity.model.js';
import ReferralEvent from '../modules/leads/referralEvent.model.js';

const leadDefinitions = [
  ['architecture_design', 'kientruchoalac', 'Nguyễn Văn Hùng', '0912000001', 'hung@example.com', 'Tư vấn thiết kế nhà ở 2 tầng trên lô đất 120 m².', '1,5 - 2 tỷ', 'Trong 3 tháng tới', 'qualified'],
  ['construction', 'kientruchoalac', 'Trần Minh Phương', '0912000002', 'phuong@example.com', 'Cần báo giá thi công trọn gói tại Thạch Hòa.', '2 - 3 tỷ', 'Cuối năm 2026', 'contacting'],
  ['renovation', 'kientruchoalac', 'Lê Hoài Nam', '0912000003', 'nam@example.com', 'Cải tạo nhà cấp bốn thành không gian lưu trú cuối tuần.', '500 - 800 triệu', 'Trong 2 tháng', 'new'],
  ['homestay_search', 'mely_space', 'Đỗ Thanh Mai', '0912000004', 'mai@example.com', 'Tìm homestay cho nhóm 12 người cuối tuần.', '8 - 12 triệu', 'Tháng 8/2026', 'qualified'],
  ['villa_booking', 'mely_space', 'Phạm Quốc Bảo', '0912000005', 'bao@example.com', 'Đặt villa có bể bơi và khu BBQ cho gia đình.', '10 - 15 triệu', 'Cuối tuần tới', 'quoted'],
  ['advertising', 'media_space', 'Công ty Dịch vụ Hòa Lạc', '0912000006', 'marketing@example.com', 'Tìm hiểu gói bài tài trợ và banner địa phương.', 'Thỏa thuận', 'Quý III/2026', 'new'],
];

export async function seedLeads({ users, areas, articles, properties }) {
  const result = [];
  for (let index = 0; index < leadDefinitions.length; index += 1) {
    const [leadType, assignedBrand, fullName, phone, email, message, budgetRange, expectedTime, status] = leadDefinitions[index];
    const sourceContent = index < 3
      ? articles['bay-buoc-chuan-bi-truoc-khi-xay-nha']
      : index < 5
        ? articles['goi-y-lich-trinh-cuoi-tuan-tai-hoa-lac']
        : null;
    const lead = await LeadRequest.findOneAndUpdate(
      { phone, leadType },
      {
        $set: {
          userId: index % 2 === 0 ? users.resident._id : null,
          sourceContentId: sourceContent?._id || properties['ban-dat-thach-hoa-120m2-duong-o-to']?.content?._id || null,
          sourcePage: sourceContent ? `/bai-viet/${sourceContent.slug}` : '/lien-he',
          fullName,
          email,
          areaId: index < 3 ? areas['thach-hoa']._id : areas['tien-xuan']._id,
          message,
          budgetRange,
          expectedTime,
          assignedBrand,
          status,
          consentAt: new Date(),
        },
      },
      { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true },
    );
    result.push(lead);

    await LeadAssignment.findOneAndUpdate(
      { leadId: lead._id, endedAt: null },
      {
        $setOnInsert: {
          leadId: lead._id,
          assignedTo: users.admin._id,
          assignedBy: users.admin._id,
          assignedAt: new Date(),
          endedAt: null,
        },
      },
      { upsert: true, new: true },
    );

    await LeadActivity.findOneAndUpdate(
      { leadId: lead._id, activityType: 'seed_created' },
      {
        $set: {
          note: 'Lead mẫu được tạo bởi bộ seed phát triển.',
          performedBy: users.admin._id,
        },
      },
      { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true },
    );
  }

  await ReferralEvent.findOneAndUpdate(
    { brand: 'kientruchoalac', sourcePage: '/bai-viet/bay-buoc-chuan-bi-truoc-khi-xay-nha', eventType: 'click' },
    {
      $set: {
        userId: users.resident._id,
        sourceContentId: articles['bay-buoc-chuan-bi-truoc-khi-xay-nha']._id,
        destinationUrl: 'https://kientruchoalac.com',
      },
    },
    { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true },
  );

  await ReferralEvent.findOneAndUpdate(
    { brand: 'mely_space', sourcePage: '/bai-viet/goi-y-lich-trinh-cuoi-tuan-tai-hoa-lac', eventType: 'form_open' },
    {
      $set: {
        userId: users.student._id,
        sourceContentId: articles['goi-y-lich-trinh-cuoi-tuan-tai-hoa-lac']._id,
        destinationUrl: 'https://mely.xspace.vn',
      },
    },
    { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true },
  );

  return result;
}
