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

export const ARTICLE_CATEGORY_RAIL = [
  { slug: 'quy-hoach', label: 'Quy hoạch' },
  { slug: 'ha-tang-giao-thong', label: 'Hạ tầng' },
  { slug: 'du-an-dtxd', label: 'Dự án ĐTXD' },
  { slug: 'bat-dong-san-hoa-lac', label: 'BĐS Hòa Lạc' },
  { slug: 'hanh-chinh', label: 'Hành chính' },
  { slug: 'chinh-sach', label: 'Chính sách' },
  { slug: 'giao-duc', label: 'Giáo dục' },
  { slug: 'khoa-hoc-cong-nghe', label: 'Khoa học - CN' },
  { slug: 'kinh-te-doanh-nghiep', label: 'Kinh tế' },
  { slug: 'doi-song-dan-cu', label: 'Đời sống' },
  { slug: 'moi-truong-do-thi', label: 'Môi trường' },
];

export const ARTICLE_DEFAULT_PAGE_COPY = {
  theme: 'news',
  seoTitle: 'Tin tức Đô Thị Hòa Lạc',
  seoDescription:
    'Tin mới tại Hòa Lạc, Thạch Thất, Tây Phương, Hạ Bằng, Yên Xuân và Phú Cát về quy hoạch, hạ tầng, dự án, bất động sản, hành chính, chính sách, giáo dục và đời sống.',
  eyebrow: 'Tin tức 6 xã',
  title: 'Tin mới quanh Đô Thị Hòa Lạc',
  description:
    'Theo dõi những chuyển động đáng chú ý tại Hòa Lạc và khu vực lân cận, được sắp xếp theo hệ chuyên mục thống nhất và dễ tra cứu.',
  searchPlaceholder: 'Tìm tin, địa bàn, dự án...',
  resultsEyebrow: 'Dòng tin cập nhật',
  latestTitle: 'Tin mới nhất',
  filteredTitle: 'Tin tức theo bộ lọc',
};

export const ARTICLE_CATEGORY_PAGE_COPY = {
  'quy-hoach': {
    theme: 'planning',
    seoTitle: 'Quy hoạch Hòa Lạc và khu vực 6 xã',
    seoDescription:
      'Cập nhật đồ án, điều chỉnh quy hoạch, sử dụng đất và định hướng phát triển không gian tại Hòa Lạc và khu vực lân cận.',
    eyebrow: 'Quy hoạch & không gian đô thị',
    title: 'Thông tin quy hoạch khu vực Hòa Lạc',
    description:
      'Theo dõi đồ án, điều chỉnh quy hoạch, chỉ tiêu sử dụng đất và định hướng phát triển không gian trong khu vực.',
    searchPlaceholder: 'Tìm đồ án, khu vực, chỉ tiêu quy hoạch...',
    resultsEyebrow: 'Thông tin quy hoạch',
    latestTitle: 'Cập nhật quy hoạch mới nhất',
    filteredTitle: 'Quy hoạch theo bộ lọc',
  },
  'ha-tang-giao-thong': {
    theme: 'infrastructure',
    seoTitle: 'Hạ tầng - Giao thông khu vực Hòa Lạc',
    seoDescription:
      'Theo dõi tiến độ đường giao thông, hạ tầng kỹ thuật, kết nối liên vùng và các công trình hạ tầng tại khu vực Hòa Lạc.',
    eyebrow: 'Hạ tầng & giao thông',
    title: 'Theo dõi tiến độ hạ tầng khu vực',
    description:
      'Cập nhật các tuyến đường, hạ tầng kỹ thuật, công trình kết nối và những thay đổi ảnh hưởng tới phát triển đô thị.',
    searchPlaceholder: 'Tìm tuyến đường, công trình, tiến độ...',
    resultsEyebrow: 'Tiến độ hạ tầng',
    latestTitle: 'Tin hạ tầng - giao thông mới nhất',
    filteredTitle: 'Hạ tầng theo bộ lọc',
  },
  'du-an-dtxd': {
    theme: 'projects',
    seoTitle: 'Dự án đầu tư xây dựng tại Hòa Lạc',
    seoDescription:
      'Thông tin các dự án đầu tư xây dựng, tiến độ triển khai, chủ trương và tác động dự án tại khu vực Hòa Lạc.',
    eyebrow: 'Dự án đầu tư xây dựng',
    title: 'Theo dõi dự án ĐTXD tại khu vực Hòa Lạc',
    description:
      'Tổng hợp chủ trương đầu tư, tiến độ, quy mô, hạng mục và các thay đổi đáng chú ý của những dự án đầu tư xây dựng.',
    searchPlaceholder: 'Tìm tên dự án, chủ đầu tư, địa điểm...',
    resultsEyebrow: 'Dự án đang được quan tâm',
    latestTitle: 'Dự án ĐTXD mới cập nhật',
    filteredTitle: 'Dự án theo bộ lọc',
  },
  'bat-dong-san-hoa-lac': {
    theme: 'property',
    seoTitle: 'BĐS Hòa Lạc',
    seoDescription:
      'Tin thị trường, dự án, pháp lý và chuyển động bất động sản tại Hòa Lạc và khu vực lân cận.',
    eyebrow: 'BĐS Hòa Lạc',
    title: 'Bất động sản Hòa Lạc dưới góc nhìn địa phương',
    description:
      'Theo dõi thị trường, dự án, pháp lý và tác động của hạ tầng tới bất động sản quanh Hòa Lạc.',
    searchPlaceholder: 'Tìm dự án, khu đất, pháp lý, thị trường...',
    resultsEyebrow: 'Chuyển động thị trường',
    latestTitle: 'Tin BĐS Hòa Lạc mới nhất',
    filteredTitle: 'BĐS theo bộ lọc',
  },
  'hanh-chinh': {
    theme: 'policy',
    seoTitle: 'Hành chính khu vực Hòa Lạc',
    seoDescription:
      'Thông tin thủ tục hành chính, tổ chức bộ máy, địa giới và hoạt động quản lý nhà nước tại khu vực Hòa Lạc.',
    eyebrow: 'Hành chính địa phương',
    title: 'Thông tin hành chính cần biết',
    description:
      'Theo dõi thủ tục, tổ chức bộ máy, địa giới và các thay đổi hành chính có liên quan trực tiếp tới người dân và doanh nghiệp.',
    searchPlaceholder: 'Tìm thủ tục, cơ quan, địa giới...',
    resultsEyebrow: 'Thông tin hành chính',
    latestTitle: 'Tin hành chính mới nhất',
    filteredTitle: 'Hành chính theo bộ lọc',
  },
  'chinh-sach': {
    theme: 'policy',
    seoTitle: 'Chính sách liên quan khu vực Hòa Lạc',
    seoDescription:
      'Cập nhật quy định, quyết định, cơ chế và chính sách tác động tới người dân, doanh nghiệp và hoạt động đầu tư tại Hòa Lạc.',
    eyebrow: 'Chính sách & quy định',
    title: 'Các chính sách có tác động tới khu vực',
    description:
      'Tổng hợp những quy định, quyết định và cơ chế đáng chú ý, ưu tiên nội dung có ảnh hưởng thực tế tới khu vực Hòa Lạc.',
    searchPlaceholder: 'Tìm chính sách, quyết định, quy định...',
    resultsEyebrow: 'Chính sách mới',
    latestTitle: 'Tin chính sách mới nhất',
    filteredTitle: 'Chính sách theo bộ lọc',
  },
  'giao-duc': {
    theme: 'education',
    seoTitle: 'Giáo dục tại khu vực Hòa Lạc',
    seoDescription:
      'Tin trường học, đại học, đào tạo, tuyển sinh, nghiên cứu và hoạt động học thuật tại khu vực Hòa Lạc.',
    eyebrow: 'Giáo dục & đào tạo',
    title: 'Giáo dục và đào tạo tại Hòa Lạc',
    description:
      'Theo dõi trường học, cơ sở đào tạo, tuyển sinh, nghiên cứu và những hoạt động giáo dục đáng chú ý trong khu vực.',
    searchPlaceholder: 'Tìm trường học, chương trình, tuyển sinh...',
    resultsEyebrow: 'Giáo dục khu vực',
    latestTitle: 'Tin giáo dục mới nhất',
    filteredTitle: 'Giáo dục theo bộ lọc',
  },
  'khoa-hoc-cong-nghe': {
    theme: 'technology',
    seoTitle: 'Khoa học - Công nghệ Hòa Lạc',
    seoDescription:
      'Tin khoa học, công nghệ, đổi mới sáng tạo, nghiên cứu và hệ sinh thái công nghệ tại Hòa Lạc.',
    eyebrow: 'Khoa học & công nghệ',
    title: 'Khoa học - Công nghệ tại Hòa Lạc',
    description:
      'Cập nhật nghiên cứu, đổi mới sáng tạo, công nghệ và hoạt động của các tổ chức trong hệ sinh thái công nghệ Hòa Lạc.',
    searchPlaceholder: 'Tìm công nghệ, nghiên cứu, đổi mới sáng tạo...',
    resultsEyebrow: 'Khoa học - Công nghệ',
    latestTitle: 'Tin khoa học - công nghệ mới nhất',
    filteredTitle: 'Khoa học - Công nghệ theo bộ lọc',
  },
  'kinh-te-doanh-nghiep': {
    theme: 'technology',
    seoTitle: 'Kinh tế - Doanh nghiệp Hòa Lạc',
    seoDescription:
      'Tin doanh nghiệp, đầu tư, sản xuất kinh doanh và hoạt động kinh tế tại khu vực Hòa Lạc.',
    eyebrow: 'Kinh tế & doanh nghiệp',
    title: 'Chuyển động kinh tế tại khu vực Hòa Lạc',
    description:
      'Cập nhật doanh nghiệp, đầu tư, sản xuất kinh doanh và các hoạt động kinh tế đáng chú ý quanh Hòa Lạc.',
    searchPlaceholder: 'Tìm doanh nghiệp, đầu tư, kinh doanh...',
    resultsEyebrow: 'Kinh tế khu vực',
    latestTitle: 'Tin kinh tế - doanh nghiệp mới nhất',
    filteredTitle: 'Kinh tế theo bộ lọc',
  },
  'doi-song-dan-cu': {
    theme: 'community-news',
    seoTitle: 'Đời sống dân cư khu vực Hòa Lạc',
    seoDescription:
      'Tin dân sinh, cộng đồng, văn hóa, tiện ích và đời sống hằng ngày tại khu vực Đô Thị Hòa Lạc.',
    eyebrow: 'Đời sống dân cư',
    title: 'Những thông tin gần với đời sống người dân',
    description:
      'Tổng hợp các vấn đề dân sinh, cộng đồng, văn hóa, tiện ích và những thay đổi có ảnh hưởng trực tiếp tới cư dân.',
    searchPlaceholder: 'Tìm dân sinh, cộng đồng, tiện ích...',
    resultsEyebrow: 'Đời sống địa phương',
    latestTitle: 'Tin đời sống mới nhất',
    filteredTitle: 'Đời sống theo bộ lọc',
  },
  'moi-truong-do-thi': {
    theme: 'community-news',
    seoTitle: 'Môi trường - Đô thị Hòa Lạc',
    seoDescription:
      'Tin môi trường, thoát nước, cảnh quan, vệ sinh, không gian công cộng và chất lượng đô thị tại Hòa Lạc.',
    eyebrow: 'Môi trường & đô thị',
    title: 'Môi trường sống và chất lượng đô thị',
    description:
      'Theo dõi môi trường, thoát nước, cảnh quan, vệ sinh và các vấn đề ảnh hưởng tới chất lượng không gian sống.',
    searchPlaceholder: 'Tìm môi trường, thoát nước, cảnh quan...',
    resultsEyebrow: 'Môi trường - Đô thị',
    latestTitle: 'Tin môi trường - đô thị mới nhất',
    filteredTitle: 'Môi trường theo bộ lọc',
  },
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
