export function normalizePhone(value) {
  if (!value) return null;
  let phone = String(value)
    .trim()
    .replace(/[\s().-]/g, '');
  if (phone.startsWith('+84')) phone = `0${phone.slice(3)}`;
  if (phone.startsWith('84') && phone.length >= 11) phone = `0${phone.slice(2)}`;
  return phone;
}

export function isVietnamesePhone(value) {
  return /^0(3|5|7|8|9)\d{8}$/.test(normalizePhone(value) ?? '');
}
