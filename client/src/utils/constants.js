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
  { slug: 'bat-dong-san', label: 'BĐS' },
  { slug: 'khu-cong-nghe-cao', label: 'Khu Công nghệ cao' },
  { slug: 'giao-duc', label: 'Giáo dục' },
  { slug: 'doi-song-cu-dan', label: 'Đời sống' },
  { slug: 'chinh-sach-hanh-chinh', label: 'Chính sách' },
];

export const ARTICLE_DEFAULT_PAGE_COPY = {
  theme: 'news',
  seoTitle: 'Tin tức Đô Thị Hòa Lạc',
  seoDescription:
    'Tin mới tại Hòa Lạc, Thạch Thất, Tây Phương, Hạ Bằng, Yên Xuân và Phú Cát về quy hoạch, hạ tầng, bất động sản, chính sách và đời sống.',
  eyebrow: 'Tin tức 6 xã',
  title: 'Tin mới quanh Đô Thị Hòa Lạc',
  description:
    'Theo dõi những chuyển động đáng chú ý tại Hòa Lạc, Thạch Thất, Tây Phương, Hạ Bằng, Yên Xuân và Phú Cát, được sắp xếp rõ theo chuyên mục và địa bàn.',
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
      'Cập nhật đồ án, điều chỉnh quy hoạch, sử dụng đất và định hướng phát triển không gian tại Hòa Lạc và 5 xã lân cận.',
    eyebrow: 'Quy hoạch & không gian đô thị',
    title: 'Cập nhật quy hoạch khu vực Hòa Lạc',
    description:
      'Theo dõi đồ án, điều chỉnh quy hoạch, chỉ tiêu sử dụng đất, định hướng phát triển không gian và các thông tin quản lý quy hoạch liên quan 6 xã.',
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
      'Cập nhật các tuyến đường, hạ tầng kỹ thuật, công trình kết nối và những thay đổi có ảnh hưởng trực tiếp đến việc đi lại, phát triển đô thị và đời sống cư dân.',
    searchPlaceholder: 'Tìm tuyến đường, công trình, tiến độ...',
    resultsEyebrow: 'Tiến độ hạ tầng',
    latestTitle: 'Tin hạ tầng - giao thông mới nhất',
    filteredTitle: 'Hạ tầng theo bộ lọc',
  },
  'du-an-dtxd': {
    theme: 'projects',
    seoTitle: 'Dự án đầu tư xây dựng tại Hòa Lạc',
    seoDescription:
      'Thông tin các dự án đầu tư xây dựng, tiến độ triển khai, chủ trương và tác động dự án tại khu vực Hòa Lạc và 6 xã trọng tâm.',
    eyebrow: 'Dự án đầu tư xây dựng',
    title: 'Theo dõi dự án ĐTXD tại khu vực Hòa Lạc',
    description:
      'Tổng hợp thông tin về chủ trương đầu tư, tiến độ triển khai, quy mô, hạng mục và các thay đổi đáng chú ý của những dự án đầu tư xây dựng trong khu vực.',
    searchPlaceholder: 'Tìm tên dự án, chủ đầu tư, địa điểm...',
    resultsEyebrow: 'Dự án đang được quan tâm',
    latestTitle: 'Dự án ĐTXD mới cập nhật',
    filteredTitle: 'Dự án theo bộ lọc',
  },
  'bat-dong-san': {
    theme: 'property',
    seoTitle: 'Bất động sản Hòa Lạc',
    seoDescription:
      'Tin thị trường, dự án, pháp lý và chuyển động bất động sản tại Hòa Lạc, Thạch Thất và các xã lân cận.',
    eyebrow: 'Thị trường bất động sản',
    title: 'Bất động sản Hòa Lạc dưới góc nhìn địa phương',
    description:
      'Theo dõi thông tin thị trường, dự án, pháp lý, hạ tầng tác động đến giá trị khu vực và những chuyển động đáng chú ý của bất động sản quanh Hòa Lạc.',
    searchPlaceholder: 'Tìm dự án, khu đất, pháp lý, thị trường...',
    resultsEyebrow: 'Chuyển động thị trường',
    latestTitle: 'Tin bất động sản mới nhất',
    filteredTitle: 'Bất động sản theo bộ lọc',
  },
  'khu-cong-nghe-cao': {
    theme: 'technology',
    seoTitle: 'Khu Công nghệ cao Hòa Lạc',
    seoDescription:
      'Thông tin đầu tư, doanh nghiệp, hạ tầng, nghiên cứu và hoạt động tại Khu Công nghệ cao Hòa Lạc.',
    eyebrow: 'Khu Công nghệ cao Hòa Lạc',
    title: 'Nhịp phát triển của Khu Công nghệ cao',
    description:
      'Cập nhật hoạt động đầu tư, doanh nghiệp, nghiên cứu, đổi mới sáng tạo và những thay đổi hạ tầng liên quan đến Khu Công nghệ cao Hòa Lạc.',
    searchPlaceholder: 'Tìm doanh nghiệp, dự án, nghiên cứu...',
    resultsEyebrow: 'Khu Công nghệ cao',
    latestTitle: 'Tin Khu Công nghệ cao mới nhất',
    filteredTitle: 'Khu Công nghệ cao theo bộ lọc',
  },
  'giao-duc': {
    theme: 'education',
    seoTitle: 'Giáo dục - Đại học tại khu vực Hòa Lạc',
    seoDescription:
      'Tin giáo dục, Đại học Quốc gia Hà Nội, trường học, đào tạo và hoạt động học thuật tại khu vực Hòa Lạc.',
    eyebrow: 'Giáo dục & đào tạo',
    title: 'Giáo dục và đại học tại khu vực Hòa Lạc',
    description:
      'Theo dõi trường học, Đại học Quốc gia Hà Nội, cơ sở đào tạo, nghiên cứu và những hoạt động giáo dục đáng chú ý trong khu vực.',
    searchPlaceholder: 'Tìm trường học, chương trình, tuyển sinh...',
    resultsEyebrow: 'Giáo dục khu vực',
    latestTitle: 'Tin giáo dục mới nhất',
    filteredTitle: 'Giáo dục theo bộ lọc',
  },
  'doi-song-cu-dan': {
    theme: 'community-news',
    seoTitle: 'Đời sống cư dân khu vực Hòa Lạc',
    seoDescription:
      'Tin dân sinh, cộng đồng, văn hóa và đời sống hằng ngày tại 6 xã khu vực Đô Thị Hòa Lạc.',
    eyebrow: 'Đời sống cư dân',
    title: 'Những câu chuyện gần với người dân khu vực',
    description:
      'Tổng hợp các thông tin dân sinh, cộng đồng, văn hóa và những thay đổi thường ngày có ảnh hưởng trực tiếp đến cư dân tại 6 xã.',
    searchPlaceholder: 'Tìm dân sinh, cộng đồng, địa bàn...',
    resultsEyebrow: 'Đời sống địa phương',
    latestTitle: 'Tin đời sống mới nhất',
    filteredTitle: 'Đời sống theo bộ lọc',
  },
  'chinh-sach-hanh-chinh': {
    theme: 'policy',
    seoTitle: 'Chính sách - Hành chính khu vực Hòa Lạc',
    seoDescription:
      'Cập nhật chính sách, thủ tục hành chính, tổ chức bộ máy và thông tin quản lý nhà nước liên quan khu vực Hòa Lạc.',
    eyebrow: 'Chính sách & hành chính',
    title: 'Thông tin chính sách liên quan khu vực',
    description:
      'Theo dõi các quyết định, thủ tục, thay đổi hành chính và thông tin quản lý nhà nước có tác động đến người dân, doanh nghiệp và hoạt động đầu tư trong khu vực.',
    searchPlaceholder: 'Tìm quyết định, thủ tục, cơ quan...',
    resultsEyebrow: 'Chính sách mới',
    latestTitle: 'Tin chính sách - hành chính mới nhất',
    filteredTitle: 'Chính sách theo bộ lọc',
  },
  'kinh-te-doanh-nghiep': {
    theme: 'technology',
    seoTitle: 'Kinh tế - Doanh nghiệp Hòa Lạc',
    seoDescription:
      'Tin doanh nghiệp, đầu tư, sản xuất kinh doanh và hoạt động kinh tế tại khu vực Hòa Lạc.',
    eyebrow: 'Kinh tế & doanh nghiệp',
    title: 'Chuyển động kinh tế tại khu vực Hòa Lạc',
    description:
      'Cập nhật doanh nghiệp, đầu tư, sản xuất kinh doanh và các hoạt động kinh tế đáng chú ý đang diễn ra quanh khu vực Hòa Lạc.',
    searchPlaceholder: 'Tìm doanh nghiệp, đầu tư, kinh doanh...',
    resultsEyebrow: 'Kinh tế khu vực',
    latestTitle: 'Tin kinh tế - doanh nghiệp mới nhất',
    filteredTitle: 'Kinh tế theo bộ lọc',
  },
  'su-kien': {
    theme: 'community-news',
    seoTitle: 'Sự kiện khu vực Hòa Lạc',
    seoDescription:
      'Thông tin hội nghị, chương trình, sự kiện cộng đồng và hoạt động nổi bật tại khu vực Hòa Lạc.',
    eyebrow: 'Sự kiện khu vực',
    title: 'Sự kiện đáng chú ý quanh Hòa Lạc',
    description:
      'Theo dõi hội nghị, chương trình cộng đồng, hoạt động văn hóa và các sự kiện đáng chú ý đang diễn ra trong khu vực.',
    searchPlaceholder: 'Tìm sự kiện, chương trình, địa điểm...',
    resultsEyebrow: 'Lịch sự kiện',
    latestTitle: 'Sự kiện mới cập nhật',
    filteredTitle: 'Sự kiện theo bộ lọc',
  },
  'an-ninh-canh-bao': {
    theme: 'policy',
    seoTitle: 'An ninh - Cảnh báo khu vực Hòa Lạc',
    seoDescription:
      'Thông tin an ninh, cảnh báo, an toàn và các lưu ý cần biết tại khu vực Hòa Lạc.',
    eyebrow: 'An ninh & cảnh báo',
    title: 'Thông tin cần biết để chủ động hơn',
    description:
      'Cập nhật các cảnh báo, vấn đề an toàn, tình hình an ninh và những thông tin người dân cần lưu ý trong khu vực.',
    searchPlaceholder: 'Tìm cảnh báo, địa điểm, sự việc...',
    resultsEyebrow: 'Thông tin cảnh báo',
    latestTitle: 'Tin an ninh - cảnh báo mới nhất',
    filteredTitle: 'Cảnh báo theo bộ lọc',
  },
  'kien-truc-xay-dung': {
    theme: 'projects',
    seoTitle: 'Kiến trúc - Xây dựng Hòa Lạc',
    seoDescription:
      'Tin kiến trúc, xây dựng, công trình và phát triển không gian tại khu vực Hòa Lạc.',
    eyebrow: 'Kiến trúc & xây dựng',
    title: 'Không gian xây dựng đang thay đổi ra sao?',
    description:
      'Theo dõi công trình, xu hướng kiến trúc, hoạt động xây dựng và những thay đổi không gian đô thị đáng chú ý tại khu vực.',
    searchPlaceholder: 'Tìm công trình, kiến trúc, xây dựng...',
    resultsEyebrow: 'Kiến trúc - xây dựng',
    latestTitle: 'Tin kiến trúc - xây dựng mới nhất',
    filteredTitle: 'Kiến trúc - xây dựng theo bộ lọc',
  },
  'du-lich-nghi-duong': {
    theme: 'community-news',
    seoTitle: 'Du lịch - Nghỉ dưỡng Hòa Lạc',
    seoDescription:
      'Tin du lịch, nghỉ dưỡng, trải nghiệm địa phương và điểm đến quanh khu vực Hòa Lạc.',
    eyebrow: 'Du lịch & nghỉ dưỡng',
    title: 'Khám phá những trải nghiệm quanh Hòa Lạc',
    description:
      'Gợi mở các điểm đến, hoạt động trải nghiệm, dịch vụ lưu trú và câu chuyện du lịch đáng chú ý trong khu vực.',
    searchPlaceholder: 'Tìm điểm đến, lưu trú, trải nghiệm...',
    resultsEyebrow: 'Du lịch khu vực',
    latestTitle: 'Tin du lịch - nghỉ dưỡng mới nhất',
    filteredTitle: 'Du lịch theo bộ lọc',
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
