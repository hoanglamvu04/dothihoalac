import { Router } from 'express';
import * as c from './job.controller.js';
import * as companyController from './job.company.controller.js';
import { optionalAuth, requireAuth } from '../../middlewares/auth.middleware.js';
import { validate } from '../../middlewares/validate.middleware.js';
import { servePendingContentPreview } from '../contents/pendingContentPreview.middleware.js';
import { createSchema, updateSchema, idSchema } from './job.validation.js';
import asyncHandler from '../../utils/asyncHandler.js';

const r = Router();
const pendingPreview = servePendingContentPreview('job');

r.get('/', asyncHandler(c.list));
r.get('/companies/:slug', asyncHandler(companyController.detail));
r.post('/', requireAuth, validate(createSchema), asyncHandler(c.create));
r.get('/:id/edit', requireAuth, validate(idSchema), asyncHandler(c.editor));
r.patch('/:id', requireAuth, validate(updateSchema), asyncHandler(c.update));
r.post('/:id/submit', requireAuth, validate(idSchema), asyncHandler(c.submit));
r.get('/:slug', optionalAuth, asyncHandler(pendingPreview), asyncHandler(c.detail));

export default r;