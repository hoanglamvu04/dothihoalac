import User from '../users/user.model.js';
import UserProfile from '../users/userProfile.model.js';
import UserSession from '../users/userSession.model.js';
import VerificationRequest from './verification.model.js';
import PasswordResetRequest from './passwordReset.model.js';
import { assignRoleBySlug, getUserAuthorization } from '../roles/role.service.js';
import { ROLES } from '../../constants/roles.js';
import { env } from '../../config/env.js';
import { sendEmail } from '../../services/email.service.js';
import { sendSms } from '../../services/sms.service.js';
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from '../../services/token.service.js';
import { hashToken, randomNumericCode, randomToken } from '../../utils/hashToken.js';
import { normalizePhone, isVietnamesePhone } from '../../utils/normalizePhone.js';
import ApiError from '../../utils/ApiError.js';

const BLOCKED_USERNAMES = new Set([
  'admin',
  'administrator',
  'root',
  'system',
  'support',
  'dothihoalac',
  'xspace',
  'media_space',
]);

function publicUser(user, authorization = { roles: [], permissions: [] }) {
  return {
    id: user._id,
    email: user.email,
    phone: user.phone,
    username: user.username,
    displayName: user.displayName,
    status: user.status,
    emailVerifiedAt: user.emailVerifiedAt,
    phoneVerifiedAt: user.phoneVerifiedAt,
    roles: authorization.roles,
    permissions: authorization.permissions,
    createdAt: user.createdAt,
  };
}

async function issueSession(user, requestMeta = {}) {
  const placeholder = randomToken();
  const session = await UserSession.create({
    userId: user._id,
    refreshTokenHash: hashToken(placeholder),
    deviceName: requestMeta.deviceName || 'Trình duyệt web',
    ipAddress: requestMeta.ipAddress || '',
    userAgent: requestMeta.userAgent || '',
    lastActiveAt: new Date(),
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  });
  const payload = { sub: String(user._id), sid: String(session._id) };
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);
  session.refreshTokenHash = hashToken(refreshToken);
  await session.save();
  return { accessToken, refreshToken, session };
}

export async function register(data, requestMeta) {
  if (BLOCKED_USERNAMES.has(data.username))
    throw new ApiError(409, 'Tên người dùng này không được phép sử dụng.', 'USERNAME_RESERVED');
  const duplicate = await User.findOne({
    $or: [{ email: data.email }, { username: data.username }],
  }).lean();
  if (duplicate) throw new ApiError(409, 'Email hoặc tên người dùng đã tồn tại.', 'ACCOUNT_EXISTS');
  const user = new User({
    email: data.email,
    username: data.username,
    displayName: data.displayName,
    passwordHash: 'pending',
  });
  await user.setPassword(data.password);
  await user.save();
  await UserProfile.create({ userId: user._id, fullName: data.displayName });
  await assignRoleBySlug(user._id, ROLES.MEMBER);
  const tokens = await issueSession(user, requestMeta);
  const authorization = await getUserAuthorization(user._id);
  return { user: publicUser(user, authorization), ...tokens };
}

export async function login({ identifier, password }, requestMeta) {
  const normalized = identifier.trim().toLowerCase();
  const user = await User.findOne({
    $or: [{ email: normalized }, { username: normalized }],
    deletedAt: null,
  }).select('+passwordHash');
  if (!user || !(await user.comparePassword(password)))
    throw new ApiError(401, 'Thông tin đăng nhập không chính xác.', 'INVALID_CREDENTIALS');
  if (['suspended', 'banned'].includes(user.status))
    throw new ApiError(403, 'Tài khoản đang bị khóa.', 'ACCOUNT_BLOCKED');
  user.lastLoginAt = new Date();
  await user.save();
  const tokens = await issueSession(user, requestMeta);
  const authorization = await getUserAuthorization(user._id);
  return { user: publicUser(user, authorization), ...tokens };
}

export async function refresh(refreshToken) {
  if (!refreshToken) throw new ApiError(401, 'Không có refresh token.', 'REFRESH_TOKEN_MISSING');
  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw new ApiError(401, 'Refresh token không hợp lệ.', 'REFRESH_TOKEN_INVALID');
  }
  const session = await UserSession.findOne({
    _id: payload.sid,
    userId: payload.sub,
    revokedAt: null,
    expiresAt: { $gt: new Date() },
  });
  if (!session || session.refreshTokenHash !== hashToken(refreshToken))
    throw new ApiError(401, 'Phiên đăng nhập không hợp lệ.', 'SESSION_INVALID');
  const user = await User.findOne({ _id: payload.sub, deletedAt: null });
  if (!user || ['suspended', 'banned'].includes(user.status))
    throw new ApiError(401, 'Tài khoản không thể sử dụng.', 'ACCOUNT_UNAVAILABLE');
  const tokenPayload = { sub: String(user._id), sid: String(session._id) };
  const accessToken = signAccessToken(tokenPayload);
  const newRefreshToken = signRefreshToken(tokenPayload);
  session.refreshTokenHash = hashToken(newRefreshToken);
  session.lastActiveAt = new Date();
  await session.save();
  const authorization = await getUserAuthorization(user._id);
  return { accessToken, refreshToken: newRefreshToken, user: publicUser(user, authorization) };
}

export async function revokeSessionByToken(refreshToken) {
  if (!refreshToken) return;
  try {
    const payload = verifyRefreshToken(refreshToken);
    await UserSession.updateOne({ _id: payload.sid }, { revokedAt: new Date() });
  } catch {
    /* cookie is cleared even if token is invalid */
  }
}

export async function revokeAllSessions(userId) {
  await UserSession.updateMany({ userId, revokedAt: null }, { revokedAt: new Date() });
}

export async function requestEmailVerification(user) {
  if (user.emailVerifiedAt) return { alreadyVerified: true };
  await VerificationRequest.deleteMany({ userId: user._id, type: 'email', verifiedAt: null });
  const code = randomNumericCode(6);
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
  await VerificationRequest.create({
    userId: user._id,
    type: 'email',
    target: user.email,
    codeHash: hashToken(code),
    expiresAt,
  });
  await sendEmail({
    to: user.email,
    subject: 'Xác thực email Đô Thị Hòa Lạc',
    template: 'verifyEmail',
    variables: { code, expiresAt: expiresAt.toLocaleString('vi-VN') },
  });
  return {
    sent: true,
    expiresAt,
    ...(env.EXPOSE_DEV_TOKENS && env.NODE_ENV !== 'production' ? { devCode: code } : {}),
  };
}

export async function confirmEmailVerification(user, code) {
  const request = await VerificationRequest.findOne({
    userId: user._id,
    type: 'email',
    verifiedAt: null,
    expiresAt: { $gt: new Date() },
  }).sort({ createdAt: -1 });
  if (!request)
    throw new ApiError(400, 'Mã xác thực đã hết hạn hoặc không tồn tại.', 'VERIFICATION_EXPIRED');
  if (request.attemptCount >= 5)
    throw new ApiError(429, 'Bạn đã nhập sai quá nhiều lần.', 'VERIFICATION_LOCKED');
  if (request.codeHash !== hashToken(code)) {
    request.attemptCount += 1;
    await request.save();
    throw new ApiError(400, 'Mã xác thực không đúng.', 'VERIFICATION_CODE_INVALID');
  }
  request.verifiedAt = new Date();
  user.emailVerifiedAt = new Date();
  await Promise.all([request.save(), user.save()]);
  return { verifiedAt: user.emailVerifiedAt };
}

export async function requestPhoneVerification(user, inputPhone) {
  const phone = normalizePhone(inputPhone);
  if (!isVietnamesePhone(phone))
    throw new ApiError(422, 'Số điện thoại Việt Nam không hợp lệ.', 'PHONE_INVALID');
  const duplicate = await User.exists({ phone, _id: { $ne: user._id } });
  if (duplicate) throw new ApiError(409, 'Số điện thoại đã được sử dụng.', 'PHONE_EXISTS');
  await VerificationRequest.deleteMany({ userId: user._id, type: 'phone', verifiedAt: null });
  const code = randomNumericCode(6);
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
  await VerificationRequest.create({
    userId: user._id,
    type: 'phone',
    target: phone,
    codeHash: hashToken(code),
    expiresAt,
  });
  await sendSms({ phone, message: `Ma xac thuc Do Thi Hoa Lac: ${code}. Ma co hieu luc 10 phut.` });
  return {
    sent: true,
    phone,
    expiresAt,
    ...(env.EXPOSE_DEV_TOKENS && env.NODE_ENV !== 'production' ? { devCode: code } : {}),
  };
}

export async function confirmPhoneVerification(user, inputPhone, code) {
  const phone = normalizePhone(inputPhone);
  const request = await VerificationRequest.findOne({
    userId: user._id,
    type: 'phone',
    target: phone,
    verifiedAt: null,
    expiresAt: { $gt: new Date() },
  }).sort({ createdAt: -1 });
  if (!request) throw new ApiError(400, 'Mã OTP đã hết hạn hoặc không tồn tại.', 'OTP_EXPIRED');
  if (request.attemptCount >= 5)
    throw new ApiError(429, 'Bạn đã nhập sai quá nhiều lần.', 'OTP_LOCKED');
  if (request.codeHash !== hashToken(code)) {
    request.attemptCount += 1;
    await request.save();
    throw new ApiError(400, 'Mã OTP không đúng.', 'OTP_INVALID');
  }
  const duplicate = await User.exists({ phone, _id: { $ne: user._id } });
  if (duplicate)
    throw new ApiError(409, 'Số điện thoại đã được tài khoản khác xác thực.', 'PHONE_EXISTS');
  request.verifiedAt = new Date();
  user.phone = phone;
  user.phoneVerifiedAt = new Date();
  await Promise.all([request.save(), user.save()]);
  await assignRoleBySlug(user._id, ROLES.VERIFIED_MEMBER);
  return { phone, verifiedAt: user.phoneVerifiedAt };
}

export async function forgotPassword(email) {
  const user = await User.findOne({ email, deletedAt: null });
  if (!user) return { accepted: true };
  await PasswordResetRequest.updateMany({ userId: user._id, usedAt: null }, { usedAt: new Date() });
  const token = randomToken(32);
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
  await PasswordResetRequest.create({ userId: user._id, tokenHash: hashToken(token), expiresAt });
  const resetUrl = `${env.APP_URL}/dat-lai-mat-khau/${token}`;
  await sendEmail({
    to: user.email,
    subject: 'Đặt lại mật khẩu Đô Thị Hòa Lạc',
    template: 'resetPassword',
    variables: { resetUrl, expiresAt: expiresAt.toLocaleString('vi-VN') },
  });
  return {
    accepted: true,
    ...(env.EXPOSE_DEV_TOKENS && env.NODE_ENV !== 'production' ? { devToken: token } : {}),
  };
}

export async function resetPassword(token, newPassword) {
  const request = await PasswordResetRequest.findOne({
    tokenHash: hashToken(token),
    usedAt: null,
    expiresAt: { $gt: new Date() },
  });
  if (!request)
    throw new ApiError(
      400,
      'Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.',
      'RESET_TOKEN_INVALID',
    );
  const user = await User.findById(request.userId).select('+passwordHash');
  if (!user) throw new ApiError(404, 'Tài khoản không tồn tại.', 'USER_NOT_FOUND');
  await user.setPassword(newPassword);
  request.usedAt = new Date();
  await Promise.all([
    user.save(),
    request.save(),
    UserSession.updateMany({ userId: user._id, revokedAt: null }, { revokedAt: new Date() }),
  ]);
  return { reset: true };
}

export async function changePassword(userId, currentPassword, newPassword) {
  const user = await User.findById(userId).select('+passwordHash');
  if (!user || !(await user.comparePassword(currentPassword)))
    throw new ApiError(400, 'Mật khẩu hiện tại không đúng.', 'CURRENT_PASSWORD_INVALID');
  await user.setPassword(newPassword);
  await user.save();
  await UserSession.updateMany({ userId, revokedAt: null }, { revokedAt: new Date() });
  return { changed: true };
}

export async function getCurrentUser(user) {
  const [authorization, profile] = await Promise.all([
    getUserAuthorization(user._id),
    UserProfile.findOne({ userId: user._id }).lean(),
  ]);
  return { ...publicUser(user, authorization), profile };
}
