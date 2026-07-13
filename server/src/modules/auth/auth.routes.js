import { Router } from 'express';
import * as controller from './auth.controller.js';
import { validate } from '../../middlewares/validate.middleware.js';
import { requireAuth, optionalAuth } from '../../middlewares/auth.middleware.js';
import { authLimiter, loginLimiter, otpLimiter } from '../../middlewares/rateLimit.middleware.js';
import {
  registerSchema,
  loginSchema,
  verifyCodeSchema,
  requestPhoneSchema,
  confirmPhoneSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
} from './auth.validation.js';
import asyncHandler from '../../utils/asyncHandler.js';

const router = Router();
router.post('/register', authLimiter, validate(registerSchema), asyncHandler(controller.register));
router.post('/login', loginLimiter, validate(loginSchema), asyncHandler(controller.login));
router.post('/logout', optionalAuth, asyncHandler(controller.logout));
router.post('/logout-all', requireAuth, asyncHandler(controller.logoutAll));
router.post('/refresh', authLimiter, asyncHandler(controller.refresh));
router.get('/me', requireAuth, asyncHandler(controller.me));
router.post(
  '/verify-email/request',
  requireAuth,
  otpLimiter,
  asyncHandler(controller.requestVerifyEmail),
);
router.post(
  '/verify-email/confirm',
  requireAuth,
  validate(verifyCodeSchema),
  asyncHandler(controller.confirmVerifyEmail),
);
router.post(
  '/phone/request-otp',
  requireAuth,
  otpLimiter,
  validate(requestPhoneSchema),
  asyncHandler(controller.requestPhoneOtp),
);
router.post(
  '/phone/confirm-otp',
  requireAuth,
  validate(confirmPhoneSchema),
  asyncHandler(controller.confirmPhoneOtp),
);
router.post(
  '/forgot-password',
  authLimiter,
  validate(forgotPasswordSchema),
  asyncHandler(controller.forgotPassword),
);
router.post(
  '/reset-password',
  authLimiter,
  validate(resetPasswordSchema),
  asyncHandler(controller.resetPassword),
);
router.patch(
  '/change-password',
  requireAuth,
  validate(changePasswordSchema),
  asyncHandler(controller.changePassword),
);
export default router;
