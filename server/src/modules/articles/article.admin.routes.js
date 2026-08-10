import { Router } from 'express';
import * as c from './article.controller.js';
import { requireAuth } from '../../middlewares/auth.middleware.js';
import { requirePermission } from '../../middlewares/role.middleware.js';
import { PERMISSIONS } from '../../constants/permissions.js';
import { validate } from '../../middlewares/validate.middleware.js';
import {
  articleBodySchema,
  articleBulkDeleteSchema,
  articleDeleteSchema,
  articleMetadataSchema,
} from './article.validation.js';
import asyncHandler from '../../utils/asyncHandler.js';

const r = Router();

r.use(
  requireAuth,
  requirePermission(
    PERMISSIONS.CREATE_ARTICLE,
    PERMISSIONS.EDIT_ARTICLE,
    PERMISSIONS.MANAGE_SYSTEM,
  ),
);

r.get('/', asyncHandler(c.adminList));
r.post('/bulk-delete', validate(articleBulkDeleteSchema), asyncHandler(c.adminBulkDelete));
r.get('/:id', asyncHandler(c.adminDetail));
r.post('/', validate(articleBodySchema), asyncHandler(c.adminCreate));
r.delete('/:id', validate(articleDeleteSchema), asyncHandler(c.adminDelete));

/*
 * Google Docs giữ nội dung; endpoint này chỉ cập nhật metadata CMS
 * như loại tin, taxonomy, hiển thị, lịch đăng và ghi chú biên tập.
 */
r.patch(
  '/:id/metadata',
  validate(articleMetadataSchema),
  asyncHandler(c.adminUpdateMetadata),
);

r.patch('/:id', validate(articleBodySchema), asyncHandler(c.adminUpdate));

export default r;
