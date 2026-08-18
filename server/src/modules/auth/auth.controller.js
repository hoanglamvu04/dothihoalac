import * as authService from './auth.service.js';
import { REFRESH_COOKIE, setAuthCookies, clearAuthCookies } from '../../services/token.service.js';
import { sendCreated, sendSuccess } from '../../utils/apiResponse.js';

function readableDeviceName(userAgent = '') {
  const agent = String(userAgent || '');

  let browser = 'Trình duyệt web';
  if (/Edg\//i.test(agent)) browser = 'Microsoft Edge';
  else if (/OPR\//i.test(agent)) browser = 'Opera';
  else if (/Firefox\//i.test(agent)) browser = 'Firefox';
  else if (/Chrome\//i.test(agent) || /CriOS\//i.test(agent)) browser = 'Google Chrome';
  else if (/Safari\//i.test(agent)) browser = 'Safari';

  let platform = '';
  if (/Windows NT/i.test(agent)) platform = 'Windows';
  else if (/iPhone/i.test(agent)) platform = 'iPhone';
  else if (/iPad/i.test(agent)) platform = 'iPad';
  else if (/Android/i.test(agent)) platform = 'Android';
  else if (/Macintosh|Mac OS X/i.test(agent)) platform = 'macOS';
  else if (/Linux/i.test(agent)) platform = 'Linux';

  return platform ? `${browser} · ${platform}` : browser;
}

function requestMeta(req) {
  const userAgent = req.get('user-agent') || '';

  return {
    ipAddress: req.ip,
    userAgent,
    deviceName: readableDeviceName(userAgent),
  };
}

export async function register(req, res) {
  const result = await authService.register(req.body, requestMeta(req));
  setAuthCookies(res, result);
  return sendCreated(res, { user: result.user }, 'Đăng ký thành công.');
}
export async function login(req, res) {
  const result = await authService.login(req.body, requestMeta(req));
  setAuthCookies(res, result);
  return sendSuccess(res, { message: 'Đăng nhập thành công.', data: { user: result.user } });
}
export async function logout(req, res) {
  await authService.revokeSessionByToken(req.cookies?.[REFRESH_COOKIE]);
  clearAuthCookies(res);
  return sendSuccess(res, { message: 'Đã đăng xuất.' });
}
export async function logoutAll(req, res) {
  await authService.revokeAllSessions(req.user._id);
  clearAuthCookies(res);
  return sendSuccess(res, { message: 'Đã đăng xuất khỏi tất cả thiết bị.' });
}
export async function refresh(req, res) {
  const result = await authService.refresh(req.cookies?.[REFRESH_COOKIE]);
  setAuthCookies(res, result);
  return sendSuccess(res, { data: { user: result.user }, message: 'Đã làm mới phiên đăng nhập.' });
}
export async function me(req, res) {
  return sendSuccess(res, { data: await authService.getCurrentUser(req.user) });
}
export async function requestVerifyEmail(req, res) {
  return sendSuccess(res, {
    data: await authService.requestEmailVerification(req.user),
    message: 'Đã xử lý yêu cầu gửi mã xác thực.',
  });
}
export async function confirmVerifyEmail(req, res) {
  return sendSuccess(res, {
    data: await authService.confirmEmailVerification(req.user, req.body.code),
    message: 'Xác thực email thành công.',
  });
}
export async function requestPhoneOtp(req, res) {
  return sendSuccess(res, {
    data: await authService.requestPhoneVerification(req.user, req.body.phone),
    message: 'Đã xử lý yêu cầu gửi OTP.',
  });
}
export async function confirmPhoneOtp(req, res) {
  return sendSuccess(res, {
    data: await authService.confirmPhoneVerification(req.user, req.body.phone, req.body.code),
    message: 'Xác thực số điện thoại thành công.',
  });
}
export async function forgotPassword(req, res) {
  return sendSuccess(res, {
    data: await authService.forgotPassword(req.body.email),
    message: 'Nếu email tồn tại, hướng dẫn đặt lại mật khẩu đã được gửi.',
  });
}
export async function resetPassword(req, res) {
  return sendSuccess(res, {
    data: await authService.resetPassword(req.body.token, req.body.newPassword),
    message: 'Đặt lại mật khẩu thành công.',
  });
}
export async function changePassword(req, res) {
  const data = await authService.changePassword(
    req.user._id,
    req.body.currentPassword,
    req.body.newPassword,
  );
  clearAuthCookies(res);
  return sendSuccess(res, { data, message: 'Đổi mật khẩu thành công. Vui lòng đăng nhập lại.' });
}
