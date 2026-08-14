export const AD_SLOT_OPTIONS = [
  {
    value: 'site_below_header',
    label: 'Toàn website · dưới thanh điều hướng',
    group: 'Toàn website',
    recommendedSize: '1200 × 160',
  },
  {
    value: 'site_before_footer',
    label: 'Toàn website · trước chân trang',
    group: 'Toàn website',
    recommendedSize: '1200 × 160',
  },
  {
    value: 'home_before_community',
    label: 'Trang chủ · trước khối Cộng đồng / Việc làm',
    group: 'Trang chủ',
    recommendedSize: '1200 × 160',
  },
  {
    value: 'home_after_community',
    label: 'Trang chủ · sau khối Cộng đồng / Việc làm',
    group: 'Trang chủ',
    recommendedSize: '1200 × 160',
  },
  {
    value: 'news_top',
    label: 'Tin tức · đầu trang danh sách',
    group: 'Tin tức',
    recommendedSize: '1200 × 160',
  },
  {
    value: 'article_top',
    label: 'Tin tức · đầu trang chi tiết',
    group: 'Tin tức',
    recommendedSize: '1200 × 160',
  },
  {
    value: 'community_top',
    label: 'Cộng đồng · đầu bảng tin',
    group: 'Cộng đồng',
    recommendedSize: '1000 × 150',
  },
  {
    value: 'community_left_primary',
    label: 'Cộng đồng · cột trái chính',
    group: 'Cộng đồng',
    recommendedSize: '220 × 600',
  },
  {
    value: 'community_left_secondary',
    label: 'Cộng đồng · cột trái phụ',
    group: 'Cộng đồng',
    recommendedSize: '220 × 220',
  },
  {
    value: 'community_right_primary',
    label: 'Cộng đồng · cột phải chính',
    group: 'Cộng đồng',
    recommendedSize: '220 × 600',
  },
  {
    value: 'community_right_secondary',
    label: 'Cộng đồng · cột phải phụ',
    group: 'Cộng đồng',
    recommendedSize: '220 × 220',
  },
  {
    value: 'property_top',
    label: 'Nhà đất · đầu trang',
    group: 'Nhà đất',
    recommendedSize: '1200 × 160',
  },
  {
    value: 'jobs_top',
    label: 'Việc làm · đầu trang',
    group: 'Việc làm',
    recommendedSize: '1200 × 160',
  },
  {
    value: 'search_top',
    label: 'Tìm kiếm · đầu trang kết quả',
    group: 'Tìm kiếm',
    recommendedSize: '1200 × 160',
  },
];

export function adSlotMeta(slotKey) {
  return AD_SLOT_OPTIONS.find((item) => item.value === slotKey) || null;
}

export function adSlotLabel(slotKey) {
  return adSlotMeta(slotKey)?.label || slotKey || 'Chưa chọn vị trí';
}
