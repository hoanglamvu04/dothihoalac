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
const editorialReadPermissions = [
  PERMISSIONS.CREATE_ARTICLE,
  PERMISSIONS.EDIT_ARTICLE,
  PERMISSIONS.APPROVE_ARTICLE,
  PERMISSIONS.PUBLISH_ARTICLE,
  PERMISSIONS.MANAGE_SYSTEM,
];

r.use(requireAuth);

r.get('/', requirePermission(...editorialReadPermissions), asyncHandler(c.adminList));
r.get('/:id', requirePermission(...editorialReadPermissions), asyncHandler(c.adminDetail));
r.post(
  '/',
  requirePermission(PERMISSIONS.CREATE_ARTICLE, PERMISSIONS.MANAGE_SYSTEM),
  validate(articleBodySchema),
  asyncHandler(c.adminCreate),
);
r.post(
  '/bulk-delete',
  requirePermission(PERMISSIONS.PUBLISH_ARTICLE, PERMISSIONS.MANAGE_SYSTEM),
  validate(articleBulkDeleteSchema),
  asyncHandler(c.adminBulkDelete),
);
r.delete(
  '/:id',
  requirePermission(PERMISSIONS.PUBLISH_ARTICLE, PERMISSIONS.MANAGE_SYSTEM),
  validate(articleDeleteSchema),
  asyncHandler(c.adminDelete),
);

/*
 * Google Docs giữ nội dung; endpoint này chỉ cập nhật metadata CMS
 * như loại tin, taxonomy, hiển thị, lịch đăng và ghi chú biên tập.
 */
r.patch(
  '/:id/metadata',
  requirePermission(
    PERMISSIONS.EDIT_ARTICLE,
    PERMISSIONS.APPROVE_ARTICLE,
    PERMISSIONS.PUBLISH_ARTICLE,
    PERMISSIONS.MANAGE_SYSTEM,
  ),
  validate(articleMetadataSchema),
  asyncHandler(c.adminUpdateMetadata),
);

r.patch(
  '/:id',
  requirePermission(PERMISSIONS.EDIT_ARTICLE, PERMISSIONS.MANAGE_SYSTEM),
  validate(articleBodySchema),
  asyncHandler(c.adminUpdate),
);

export default r;
