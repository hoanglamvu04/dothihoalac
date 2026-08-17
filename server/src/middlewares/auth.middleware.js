import User from '../modules/users/user.model.js';
import { getUserAuthorization } from '../modules/roles/role.service.js';
import { ACCESS_COOKIE, verifyAccessToken } from '../services/token.service.js';
import ApiError from '../utils/ApiError.js';

function extractToken(req) {
  const bearer = req.get('authorization');
  if (bearer?.startsWith('Bearer ')) return bearer.slice(7);
  return req.cookies?.[ACCESS_COOKIE] ?? null;
}

async function resolveAuth(req, required) {
  const token = extractToken(req);
  if (!token) {
    if (required) throw new ApiError(401, 'Bạn cần đăng nhập.', 'AUTH_REQUIRED');
    return null;
  }

  let payload;
  try {
    payload = verifyAccessToken(token);
  } catch {
    if (required) throw new ApiError(401, 'Phiên đăng nhập đã hết hạn.', 'ACCESS_TOKEN_INVALID');
    return null;
  }

  const user = await User.findOne({ _id: payload.sub, deletedAt: null });
  if (!user) {
    if (required) throw new ApiError(401, 'Tài khoản không tồn tại.', 'USER_NOT_FOUND');
    return null;
  }

  // Không cho tồn tại trạng thái "đã xác thực" nhưng lại không có số điện thoại.
  // Dữ liệu seed/cũ có thể từng rơi vào trạng thái này và làm UI hiểu nhầm.
  if (!user.phone && user.phoneVerifiedAt) {
    user.phoneVerifiedAt = null;
    await user.save();
  }

  if (['suspended', 'banned'].includes(user.status)) {
    throw new ApiError(403, 'Tài khoản đang bị khóa hoặc tạm đình chỉ.', 'ACCOUNT_BLOCKED');
  }

  const authorization = await getUserAuthorization(user._id);
  req.user = user;
  req.auth = { userId: user._id, sessionId: payload.sid, ...authorization };
  return user;
}

export async function requireAuth(req, _res, next) {
  try {
    await resolveAuth(req, true);
    next();
  } catch (error) {
    next(error);
  }
}

export async function optionalAuth(req, _res, next) {
  try {
    await resolveAuth(req, false);
    next();
  } catch (error) {
    next(error);
  }
}
