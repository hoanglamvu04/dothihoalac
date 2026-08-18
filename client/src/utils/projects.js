export const PROJECT_TYPES = [
  ['transport', 'Giao thông'],
  ['urban', 'Đô thị / Quy hoạch'],
  ['education', 'Giáo dục'],
  ['technology', 'Khoa học - Công nghệ'],
  ['industrial', 'Khu công nghiệp / Công nghệ cao'],
  ['housing', 'Nhà ở / Bất động sản'],
  ['public', 'Công trình công cộng'],
  ['environment', 'Môi trường / Hạ tầng kỹ thuật'],
  ['other', 'Khác'],
];

export const PROJECT_STATUSES = [
  ['proposed', 'Đề xuất'],
  ['planning', 'Lập quy hoạch / chuẩn bị chủ trương'],
  ['approved', 'Đã phê duyệt'],
  ['preparing', 'Chuẩn bị đầu tư'],
  ['tendering', 'Đấu thầu / lựa chọn nhà thầu'],
  ['construction', 'Đang thi công'],
  ['paused', 'Tạm dừng / chậm tiến độ'],
  ['completed', 'Hoàn thành'],
  ['cancelled', 'Dừng / hủy'],
];

export const PROJECT_PRIORITIES = [
  ['low', 'Thấp'],
  ['normal', 'Bình thường'],
  ['high', 'Cao'],
  ['critical', 'Trọng điểm'],
];

export const MILESTONE_STATUSES = [
  ['pending', 'Chưa bắt đầu'],
  ['in_progress', 'Đang thực hiện'],
  ['completed', 'Hoàn thành'],
  ['delayed', 'Chậm tiến độ'],
  ['cancelled', 'Hủy'],
];

function labelOf(options, value, fallback = 'Không xác định') {
  return options.find(([key]) => key === value)?.[1] || fallback;
}

export function projectTypeLabel(value) {
  return labelOf(PROJECT_TYPES, value);
}

export function projectStatusLabel(value) {
  return labelOf(PROJECT_STATUSES, value);
}

export function projectPriorityLabel(value) {
  return labelOf(PROJECT_PRIORITIES, value);
}

export function milestoneStatusLabel(value) {
  return labelOf(MILESTONE_STATUSES, value);
}

export function projectStatusTone(value) {
  if (value === 'completed') return 'success';
  if (value === 'construction') return 'primary';
  if (value === 'paused') return 'danger';
  if (value === 'cancelled') return 'danger';
  if (['approved', 'preparing', 'tendering'].includes(value)) return 'warning';
  return 'soft';
}

export function projectIsDelayed(project) {
  if (!project?.expectedCompletionDate) return false;
  if (['completed', 'cancelled'].includes(project?.status)) return false;
  const deadline = new Date(project.expectedCompletionDate);
  return !Number.isNaN(deadline.getTime()) && deadline.getTime() < Date.now();
}

export function formatProjectInvestment(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) return 'Chưa cập nhật';
  if (amount >= 1_000_000_000_000) {
    return `${(amount / 1_000_000_000_000).toLocaleString('vi-VN', { maximumFractionDigits: 2 })} nghìn tỷ`;
  }
  if (amount >= 1_000_000_000) {
    return `${(amount / 1_000_000_000).toLocaleString('vi-VN', { maximumFractionDigits: 1 })} tỷ`;
  }
  if (amount >= 1_000_000) {
    return `${(amount / 1_000_000).toLocaleString('vi-VN', { maximumFractionDigits: 1 })} triệu`;
  }
  return `${amount.toLocaleString('vi-VN')} đ`;
}
