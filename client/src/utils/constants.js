export const CONTENT_TYPES = {
  article: 'Tin tức',
  community: 'Cộng đồng',
  property: 'Bất động sản',
  job: 'Việc làm',
  event: 'Sự kiện',
};

export const CONTENT_STATUS = {
  draft: 'Bản nháp',
  pending_review: 'Chờ duyệt',
  needs_revision: 'Cần chỉnh sửa',
  approved: 'Đã duyệt',
  scheduled: 'Đã lên lịch',
  published: 'Đã xuất bản',
  rejected: 'Bị từ chối',
  hidden: 'Đã ẩn',
  archived: 'Đã lưu trữ',
  expired: 'Hết hạn',
  deleted: 'Đã xóa',
};

export const COMMUNITY_TYPES = {
  discussion: 'Thảo luận',
  question: 'Hỏi đáp',
  report: 'Phản ánh',
  sharing: 'Chia sẻ',
  review: 'Review',
  support: 'Tìm kiếm - hỗ trợ',
  marketplace: 'Mua bán - trao đổi',
  community_event: 'Sự kiện cộng đồng',
  other: 'Khác',
};

export const TRANSACTION_TYPES = {
  sale: 'Cần bán',
  rent: 'Cho thuê',
  transfer: 'Sang nhượng',
  wanted_buy: 'Cần mua',
  wanted_rent: 'Cần thuê',
};

export const PROPERTY_TYPES = {
  residential_land: 'Đất thổ cư',
  land_plot: 'Đất nền',
  project_land: 'Đất dự án',
  service_land: 'Đất dịch vụ',
  house: 'Nhà riêng',
  townhouse: 'Nhà liền kề',
  villa: 'Biệt thự',
  apartment: 'Chung cư',
  mini_apartment: 'Căn hộ mini',
  room: 'Phòng trọ',
  whole_house: 'Nhà nguyên căn',
  commercial_space: 'Mặt bằng kinh doanh',
  office: 'Văn phòng',
  warehouse: 'Kho, xưởng',
  farm: 'Trang trại, nhà vườn',
};

export const OWNER_TYPES = {
  owner: 'Chính chủ',
  broker: 'Môi giới',
  business: 'Doanh nghiệp',
};

export const PRICE_UNITS = {
  total: 'Tổng giá',
  per_m2: 'Theo m²',
  per_month: 'Theo tháng',
  negotiable: 'Thỏa thuận',
};

export const LEGAL_STATUS = {
  red_book: 'Sổ đỏ',
  contract: 'Hợp đồng',
  waiting_certificate: 'Đang chờ sổ',
  shared_certificate: 'Sổ chung',
  other: 'Khác',
  unknown: 'Chưa rõ',
};

export const DIRECTIONS = {
  north: 'Bắc',
  south: 'Nam',
  east: 'Đông',
  west: 'Tây',
  northeast: 'Đông Bắc',
  northwest: 'Tây Bắc',
  southeast: 'Đông Nam',
  southwest: 'Tây Nam',
  unknown: 'Chưa xác định',
};

export const JOB_TYPES = {
  full_time: 'Toàn thời gian',
  part_time: 'Bán thời gian',
  internship: 'Thực tập',
  temporary: 'Thời vụ',
  student: 'Việc làm sinh viên',
  construction: 'Xây dựng',
  service: 'Dịch vụ',
};

export const EXPERIENCE_LEVELS = {
  none: 'Không yêu cầu',
  under_1_year: 'Dưới 1 năm',
  '1_3_years': '1-3 năm',
  '3_5_years': '3-5 năm',
  over_5_years: 'Trên 5 năm',
};

export const REACTIONS = [
  { value: 'like', label: 'Thích', emoji: '👍' },
  { value: 'interested', label: 'Quan tâm', emoji: '👀' },
  { value: 'helpful', label: 'Hữu ích', emoji: '💡' },
  { value: 'surprised', label: 'Bất ngờ', emoji: '😮' },
  { value: 'disagree', label: 'Không đồng tình', emoji: '🤔' },
];

export const REPORT_REASONS = {
  spam: 'Spam hoặc quảng cáo rác',
  false_information: 'Thông tin sai lệch',
  harassment: 'Quấy rối hoặc xúc phạm',
  scam: 'Có dấu hiệu lừa đảo',
  privacy: 'Xâm phạm quyền riêng tư',
  copyright: 'Vi phạm bản quyền',
  wrong_category: 'Sai chuyên mục',
  duplicate: 'Nội dung trùng lặp',
  other: 'Lý do khác',
};

export const ADMIN_ROLES = [
  'moderator',
  'editor',
  'chief_editor',
  'user_admin',
  'system_admin',
];

export const LEAD_TYPES = {
  architecture_design: 'Tư vấn thiết kế kiến trúc',
  construction: 'Thi công xây dựng',
  renovation: 'Cải tạo công trình',
  cost_estimation: 'Ước tính chi phí xây dựng',
  homestay_search: 'Tìm homestay',
  villa_booking: 'Đặt villa',
  event_booking: 'Tổ chức sự kiện',
  advertising: 'Quảng cáo',
  partnership: 'Hợp tác',
};

export const LEAD_STATUS = {
  new: 'Mới',
  contacted: 'Đã liên hệ',
  qualified: 'Có nhu cầu phù hợp',
  proposal_sent: 'Đã gửi đề xuất',
  converted: 'Đã chuyển đổi',
  lost: 'Không thành công',
  spam: 'Spam',
};
