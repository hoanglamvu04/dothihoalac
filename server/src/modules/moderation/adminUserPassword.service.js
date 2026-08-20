import User from '../users/user.model.js';
import UserSession from '../users/userSession.model.js';
import { getUserAuthorization, STAFF_ROLE_SLUGS } from '../roles/role.service.js';
import { ROLES } from '../../constants/roles.js';
import { writeAuditLog } from '../../services/audit.service.js';
import ApiError from '../../utils/ApiError.js';

function validatePassword(password) {
  if (typeof password !== 'string' || password.length < 8) {
    throw new ApiError(422, 'Mật khẩu phải có ít nhất 8 ký tự.', 'PASSWORD_TOO_SHORT');
  }
  if (!/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
    throw new ApiError(422, 'Mật khẩu cần có chữ hoa và số.', 'PASSWORD_TOO_WEAK');
  }
}

export async function changePassword(admin, auth, userId, password, ip) {
  validatePassword(password);

  const user = await User.findById(userId);
  if (!user) throw new ApiError(404, 'Không tìm thấy người dùng.', 'USER_NOT_FOUND');

  const targetAuthorization = await getUserAuthorization(userId);
  const targetIsStaff = targetAuthorization.roles.some((role) => STAFF_ROLE_SLUGS.includes(role));
  const actorIsSystemAdmin = auth?.roles?.includes(ROLES.SYSTEM_ADMIN);

  if (targetIsStaff && !actorIsSystemAdmin) {
    throw new ApiError(
      403,
      'Chỉ System Admin mới được đổi mật khẩu tài khoản nhân sự quản trị.',
      'STAFF_PASSWORD_CHANGE_FORBIDDEN',
    );
  }

  await user.setPassword(password);
  await user.save();

  await UserSession.updateMany(
    { userId, revokedAt: null },
    { revokedAt: new Date() },
  );

  await writeAuditLog({
    adminId: admin._id,
    action: 'user.password_change',
    targetType: 'user',
    targetId: userId,
    oldData: {},
    newData: { sessionsRevoked: true },
    ipAddress: ip,
  });

  return { id: userId, sessionsRevoked: true };
}
