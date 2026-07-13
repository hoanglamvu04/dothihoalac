import mongoose from 'mongoose';
import { logger } from '../config/logger.js';
import ApiError from '../utils/ApiError.js';

function normalizeError(error) {
  if (error instanceof ApiError) return error;
  if (error instanceof mongoose.Error.CastError) {
    return new ApiError(400, 'ID hoặc dữ liệu truy vấn không hợp lệ.', 'INVALID_ID');
  }
  if (error instanceof mongoose.Error.ValidationError) {
    const details = Object.values(error.errors).map((item) => ({
      path: item.path,
      message: item.message,
    }));
    return new ApiError(422, 'Dữ liệu không hợp lệ.', 'MONGOOSE_VALIDATION_ERROR', details);
  }
  if (error?.code === 11000) {
    return new ApiError(409, 'Dữ liệu đã tồn tại.', 'DUPLICATE_RESOURCE', error.keyValue);
  }
  if (error?.name === 'JsonWebTokenError' || error?.name === 'TokenExpiredError') {
    return new ApiError(401, 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn.', 'INVALID_TOKEN');
  }
  if (error?.code === 'LIMIT_FILE_SIZE') {
    return new ApiError(413, 'Tệp tải lên vượt quá dung lượng cho phép.', 'FILE_TOO_LARGE');
  }
  return new ApiError(500, 'Máy chủ gặp lỗi ngoài dự kiến.', 'INTERNAL_SERVER_ERROR');
}

export function errorMiddleware(error, req, res, _next) {
  const normalized = normalizeError(error);
  const logPayload = {
    requestId: req.id,
    method: req.method,
    url: req.originalUrl,
    code: normalized.code,
  };
  if (normalized.statusCode >= 500) logger.error({ ...logPayload, err: error }, 'Request failed');
  else logger.warn({ ...logPayload, message: normalized.message }, 'Request rejected');

  return res.status(normalized.statusCode).json({
    success: false,
    message: normalized.message,
    code: normalized.code,
    errors: normalized.details,
    requestId: req.id,
  });
}
