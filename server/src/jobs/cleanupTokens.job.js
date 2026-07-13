import VerificationRequest from '../modules/auth/verification.model.js';
import PasswordResetRequest from '../modules/auth/passwordReset.model.js';
import UserSession from '../modules/users/userSession.model.js';
export async function cleanupTokens() {
  const now = new Date();
  const [a, b, c] = await Promise.all([
    VerificationRequest.deleteMany({ expiresAt: { $lt: now } }),
    PasswordResetRequest.deleteMany({ expiresAt: { $lt: now } }),
    UserSession.deleteMany({
      $or: [
        { expiresAt: { $lt: now } },
        { revokedAt: { $lt: new Date(Date.now() - 30 * 86400000) } },
      ],
    }),
  ]);
  return a.deletedCount + b.deletedCount + c.deletedCount;
}
