import { Router } from 'express';
import * as c from './comment.controller.js';
import { requireAuth } from '../../middlewares/auth.middleware.js';
import { validate } from '../../middlewares/validate.middleware.js';
import { listSchema, createSchema, updateSchema, idSchema } from './comment.validation.js';
import asyncHandler from '../../utils/asyncHandler.js';
const r = Router();
r.get('/contents/:contentId/comments', validate(listSchema), asyncHandler(c.list));
r.post(
  '/contents/:contentId/comments',
  requireAuth,
  validate(createSchema),
  asyncHandler(c.create),
);
r.patch('/comments/:id', requireAuth, validate(updateSchema), asyncHandler(c.update));
r.delete('/comments/:id', requireAuth, validate(idSchema), asyncHandler(c.remove));
export default r;
