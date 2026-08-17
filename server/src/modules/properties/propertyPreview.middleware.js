import Content from '../contents/content.model.js';
import ContentBody from '../contents/contentBody.model.js';
import PropertyListing from './propertyListing.model.js';
import PropertyFeature from './propertyFeature.model.js';
import { ADMIN_ROLES } from '../../constants/roles.js';
import { sendSuccess } from '../../utils/apiResponse.js';

const AUTHOR_PREVIEW_STATUSES = new Set([
  'draft',
  'pending_review',
  'needs_revision',
  'approved',
  'scheduled',
  'rejected',
  'expired',
]);

function idString(value) {
  return String(value?._id || value || '');
}

function isAdminViewer(auth) {
  const roles = Array.isArray(auth?.roles) ? auth.roles : [];
  return roles.some((role) => ADMIN_ROLES.includes(role));
}

export async function servePropertyPreviewIfAllowed(req, res, next) {
  if (!req.auth?.userId) return next();

  const slug = String(req.params.slug || '').trim().toLowerCase();
  if (!slug) return next();

  const content = await Content.findOne({
    slug,
    contentType: 'property',
    status: { $ne: 'published' },
    deletedAt: null,
  })
    .populate('authorId', 'username displayName emailVerifiedAt phoneVerifiedAt status')
    .populate('primaryAreaId', 'name slug areaType description')
    .populate('primaryCategoryId', 'name slug contentScope description')
    .populate('tagIds', 'name slug')
    .populate('thumbnailMediaId', 'url secureUrl altText width height resourceType')
    .lean();

  if (!content) return next();

  const authorId = idString(content.authorId);
  const viewerId = idString(req.auth.userId);
  const isAuthor = authorId === viewerId;
  const isAdmin = isAdminViewer(req.auth);

  if (!isAdmin && (!isAuthor || !AUTHOR_PREVIEW_STATUSES.has(content.status))) {
    return next();
  }

  const [body, property] = await Promise.all([
    ContentBody.findOne({ contentId: content._id }).lean(),
    PropertyListing.findOne({ contentId: content._id })
      .populate({
        path: 'featureIds',
        model: PropertyFeature,
        select: 'name slug featureGroup isActive',
      })
      .populate('galleryMediaIds', 'url secureUrl altText width height resourceType')
      .lean(),
  ]);

  if (!property) return next();

  return sendSuccess(res, {
    data: {
      ...content,
      allowComments: false,
      body: body || {
        contentId: content._id,
        bodyHtml: '',
        bodyText: '',
        readingTime: 1,
        wordCount: 0,
        inlineMediaIds: [],
      },
      property,
      viewerAccess: {
        mode: isAdmin ? 'admin_preview' : 'author_preview',
        preview: true,
        canModerate: isAdmin,
        canEdit: isAuthor,
      },
    },
  });
}
