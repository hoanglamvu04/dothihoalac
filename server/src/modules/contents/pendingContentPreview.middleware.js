import Content from './content.model.js';
import ContentBody from './contentBody.model.js';
import Article from '../articles/article.model.js';
import CommunityPost from '../community/communityPost.model.js';
import JobPost from '../jobs/jobPost.model.js';
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

const DETAIL_CONFIG = {
  article: { key: 'article', Model: Article },
  community: { key: 'community', Model: CommunityPost },
  job: { key: 'job', Model: JobPost },
};

function idString(value) {
  return String(value?._id || value || '');
}

function isAdminViewer(auth) {
  const roles = Array.isArray(auth?.roles) ? auth.roles : [];
  return roles.some((role) => ADMIN_ROLES.includes(role));
}

export function servePendingContentPreview(contentType) {
  const config = DETAIL_CONFIG[contentType];
  if (!config) throw new Error(`Unsupported preview content type: ${contentType}`);

  return async function pendingContentPreview(req, res, next) {
    if (!req.auth?.userId) return next();

    const slug = String(req.params.slug || '').trim().toLowerCase();
    if (!slug) return next();

    const content = await Content.findOne({
      slug,
      contentType,
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

    const isAuthor = idString(content.authorId) === idString(req.auth.userId);
    const isAdmin = isAdminViewer(req.auth);

    if (!isAdmin && (!isAuthor || !AUTHOR_PREVIEW_STATUSES.has(content.status))) {
      return next();
    }

    const [body, detail] = await Promise.all([
      ContentBody.findOne({ contentId: content._id }).lean(),
      config.Model.findOne({ contentId: content._id }).lean(),
    ]);

    if (!detail) return next();

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
        [config.key]: detail,
        viewerAccess: {
          mode: isAdmin ? 'admin_preview' : 'author_preview',
          preview: true,
          canModerate: isAdmin,
          canEdit: isAuthor,
        },
      },
    });
  };
}
