import { rateLimit } from 'express-rate-limit';

function createLimiter({ windowMs, limit, message }) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { success: false, message, code: 'RATE_LIMITED' },
  });
}

export const apiLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 500,
  message: 'Bạn gửi quá nhiều yêu cầu.',
});
export const authLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  message: 'Quá nhiều yêu cầu xác thực. Vui lòng thử lại sau.',
});
export const loginLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  message: 'Đăng nhập sai quá nhiều lần. Vui lòng thử lại sau.',
});
export const otpLimiter = createLimiter({
  windowMs: 10 * 60 * 1000,
  limit: 5,
  message: 'Bạn đã yêu cầu mã quá nhiều lần.',
});
export const contentCreateLimiter = createLimiter({
  windowMs: 60 * 60 * 1000,
  limit: 30,
  message: 'Bạn đã đăng quá nhiều nội dung trong thời gian ngắn.',
});
