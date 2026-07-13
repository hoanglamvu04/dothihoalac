export function formatDate(value, options = {}) {
  if (!value) return 'Chưa cập nhật';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Không xác định';
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    ...options,
  }).format(date);
}

export function formatDateTime(value) {
  return formatDate(value, { hour: '2-digit', minute: '2-digit' });
}

export function formatRelativeTime(value) {
  if (!value) return '';
  const date = new Date(value);
  const diff = date.getTime() - Date.now();
  const units = [
    ['year', 365 * 24 * 60 * 60 * 1000],
    ['month', 30 * 24 * 60 * 60 * 1000],
    ['day', 24 * 60 * 60 * 1000],
    ['hour', 60 * 60 * 1000],
    ['minute', 60 * 1000],
  ];
  const formatter = new Intl.RelativeTimeFormat('vi', { numeric: 'auto' });
  for (const [unit, ms] of units) {
    if (Math.abs(diff) >= ms || unit === 'minute') {
      return formatter.format(Math.round(diff / ms), unit);
    }
  }
  return 'vừa xong';
}

export function formatNumber(value) {
  const number = Number(value || 0);
  return new Intl.NumberFormat('vi-VN').format(number);
}

export function formatCurrency(value, unit = 'total') {
  const number = Number(value || 0);
  if (unit === 'negotiable' || number === 0) return 'Thỏa thuận';
  const suffix = unit === 'per_m2' ? '/m²' : unit === 'per_month' ? '/tháng' : '';
  if (number >= 1_000_000_000) {
    return `${(number / 1_000_000_000).toLocaleString('vi-VN', { maximumFractionDigits: 2 })} tỷ${suffix}`;
  }
  if (number >= 1_000_000) {
    return `${(number / 1_000_000).toLocaleString('vi-VN', { maximumFractionDigits: 2 })} triệu${suffix}`;
  }
  return `${formatNumber(number)} đ${suffix}`;
}

export function truncate(text = '', length = 160) {
  if (text.length <= length) return text;
  return `${text.slice(0, length).trim()}…`;
}

export function initials(name = 'ĐT') {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(-2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}
