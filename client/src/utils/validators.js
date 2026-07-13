export function required(value) {
  return value !== undefined && value !== null && String(value).trim() !== '';
}

export function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());
}

export function isVietnamesePhone(value) {
  const normalized = String(value || '').replace(/[\s.-]/g, '').replace(/^\+84/, '0');
  return /^0[3-9]\d{8}$/.test(normalized);
}

export function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function compactObject(object) {
  return Object.fromEntries(
    Object.entries(object).filter(([, value]) => value !== '' && value !== undefined),
  );
}
