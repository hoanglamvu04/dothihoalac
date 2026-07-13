import ApiError from '../utils/ApiError.js';

export function requireRole(...allowedRoles) {
  return (req, _res, next) => {
    if (!req.auth) return next(new ApiError(401, 'Bạn cần đăng nhập.', 'AUTH_REQUIRED'));
    if (!allowedRoles.some((role) => req.auth.roles.includes(role))) {
      return next(new ApiError(403, 'Bạn không có vai trò phù hợp.', 'ROLE_FORBIDDEN'));
    }
    return next();
  };
}

export function requirePermission(...allowedPermissions) {
  return (req, _res, next) => {
    if (!req.auth) return next(new ApiError(401, 'Bạn cần đăng nhập.', 'AUTH_REQUIRED'));
    if (!allowedPermissions.some((permission) => req.auth.permissions.includes(permission))) {
      return next(
        new ApiError(403, 'Bạn không có quyền thực hiện thao tác này.', 'PERMISSION_FORBIDDEN'),
      );
    }
    return next();
  };
}
