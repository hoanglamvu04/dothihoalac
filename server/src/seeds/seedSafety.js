import { env } from '../config/env.js';
import { logger } from '../config/logger.js';
import User from '../modules/users/user.model.js';
import UserSession from '../modules/users/userSession.model.js';

const DEFAULT_DEMO_PASSWORD = 'Demo@123456';

const KNOWN_DEMO_EMAILS = [
  'truongban@dothihoalac.vn',
  'bientap@dothihoalac.vn',
  'kiemduyet@dothihoalac.vn',
  'congtacvien@dothihoalac.vn',
  'moigioi@example.com',
  'doanhnghiep@example.com',
  'cudan@example.com',
  'sinhvien@example.com',
  'tuyendung@example.com',
  'thanhvien@example.com',
];

export function assertDemoSeedAllowed(
  operation = 'demo seed',
  nodeEnv = env.NODE_ENV,
) {
  if (nodeEnv !== 'production') return;

  throw new Error(
    `Refusing to run ${operation} in production. ` +
      'Production may only use the core seed for roles, taxonomy and the configured administrator.',
  );
}

function unsafeDemoPasswords() {
  const configured = String(process.env.SEED_USER_PASSWORD || '').trim();
  return [...new Set([DEFAULT_DEMO_PASSWORD, configured].filter(Boolean))];
}

async function hasUnsafeDemoPassword(user, passwords) {
  for (const password of passwords) {
    if (await user.comparePassword(password)) return true;
  }

  return false;
}

/**
 * Production startup guard for databases that may have been seeded in the past.
 * Only known seed accounts that still use a seed password are suspended. Real
 * accounts with the same email whose password was changed are left untouched.
 */
export async function neutralizeUnsafeProductionDemoAccounts() {
  if (env.NODE_ENV !== 'production') {
    return { scanned: 0, suspended: 0, emails: [] };
  }

  const candidates = await User.find({
    email: { $in: KNOWN_DEMO_EMAILS },
    deletedAt: null,
  }).select('+passwordHash');

  if (!candidates.length) {
    return { scanned: 0, suspended: 0, emails: [] };
  }

  const passwords = unsafeDemoPasswords();
  const suspendedIds = [];
  const emails = [];

  for (const user of candidates) {
    if (!(await hasUnsafeDemoPassword(user, passwords))) continue;

    if (user.status !== 'suspended' && user.status !== 'banned') {
      user.status = 'suspended';
      await user.save();
    }

    suspendedIds.push(user._id);
    emails.push(user.email);
  }

  if (suspendedIds.length) {
    await UserSession.updateMany(
      { userId: { $in: suspendedIds }, revokedAt: null },
      { $set: { revokedAt: new Date() } },
    );

    logger.warn(
      { count: suspendedIds.length, emails },
      'Suspended production seed accounts that still used demo credentials',
    );
  }

  return {
    scanned: candidates.length,
    suspended: suspendedIds.length,
    emails,
  };
}
