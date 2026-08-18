import { Router } from 'express';
import * as c from './user.controller.js';
import { requireAuth } from '../../middlewares/auth.middleware.js';
import { validate } from '../../middlewares/validate.middleware.js';
import asyncHandler from '../../utils/asyncHandler.js';
import {
  usernameParamSchema,
  updateProfileSchema,
  changeUsernameSchema,
  sessionParamSchema,
} from './user.validation.js';

const r = Router();

r.get('/me/profile', requireAuth, asyncHandler(c.myProfile));
r.patch('/me/profile', requireAuth, validate(updateProfileSchema), asyncHandler(c.updateMyProfile));
r.patch(
  '/me/username',
  requireAuth,
  validate(changeUsernameSchema),
  asyncHandler(c.updateUsername),
);
r.get('/me/sessions', requireAuth, asyncHandler(c.sessions));
r.delete(
  '/me/sessions/:id',
  requireAuth,
  validate(sessionParamSchema),
  asyncHandler(c.revokeSession),
);
r.get('/me/posts', requireAuth, asyncHandler(c.myPosts));
r.get('/me/listings', requireAuth, asyncHandler(c.myListings));
r.get('/me/bookmarks', requireAuth, asyncHandler(c.myBookmarks));
r.get('/me/reports', requireAuth, asyncHandler(c.myReports));
r.get('/me/activity', requireAuth, asyncHandler(c.myActivity));
r.delete(
  '/me/activity/searches',
  requireAuth,
  asyncHandler(c.clearMySearchActivity),
);
r.get('/:username', validate(usernameParamSchema), asyncHandler(c.publicProfile));

export default r;
