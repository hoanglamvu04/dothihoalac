import crypto from 'node:crypto';

export function hashToken(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex');
}

export function randomToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString('hex');
}

export function randomNumericCode(length = 6) {
  const max = 10 ** length;
  return String(crypto.randomInt(0, max)).padStart(length, '0');
}
