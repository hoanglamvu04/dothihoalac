import ApiError from '../utils/ApiError.js';

export function notFoundMiddleware(req, _res, next) {
  next(
    new ApiError(
      404,
      `Không tìm thấy endpoint ${req.method} ${req.originalUrl}.`,
      'ROUTE_NOT_FOUND',
    ),
  );
}
