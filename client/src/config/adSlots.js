export const AD_SLOT_OPTIONS = [
  {
    value: 'site_below_header',
    label: 'Toàn website · dưới thanh điều hướng',
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
];

export function adSlotMeta(slotKey) {
  return AD_SLOT_OPTIONS.find((item) => item.value === slotKey) || null;
}

export function adSlotLabel(slotKey) {
  return adSlotMeta(slotKey)?.label || slotKey || 'Chưa chọn vị trí';
}
