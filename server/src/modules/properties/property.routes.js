import { Router } from 'express';
import * as c from './property.controller.js';
import { requireAuth, optionalAuth } from '../../middlewares/auth.middleware.js';
import { validate } from '../../middlewares/validate.middleware.js';
import { contentCreateLimiter } from '../../middlewares/rateLimit.middleware.js';
import { servePropertyPreviewIfAllowed } from './propertyPreview.middleware.js';
import {
  createSchema,
  updateSchema,
  idSchema,
  slugSchema,
  contactSchema,
} from './property.validation.js';
import asyncHandler from '../../utils/asyncHandler.js';
const r = Router();
r.get('/', asyncHandler(c.list));
r.post('/', requireAuth, contentCreateLimiter, validate(createSchema), asyncHandler(c.create));
r.patch('/:id', requireAuth, validate(updateSchema), asyncHandler(c.update));
r.post('/:id/submit', requireAuth, validate(idSchema), asyncHandler(c.submit));
r.post('/:id/renew', requireAuth, validate(idSchema), asyncHandler(c.renew));
r.post('/:id/mark-sold', requireAuth, validate(idSchema), asyncHandler(c.sold));
r.post('/:id/mark-rented', requireAuth, validate(idSchema), asyncHandler(c.rented));
r.post('/:id/contact-events', optionalAuth, validate(contactSchema), asyncHandler(c.contact));
r.get(
  '/:slug',
  optionalAuth,
  validate(slugSchema),
  asyncHandler(servePropertyPreviewIfAllowed),
  asyncHandler(c.detail),
);
export default r;
