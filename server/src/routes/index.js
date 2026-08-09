import { Router } from 'express';
import healthRoutes from '../modules/health/health.routes.js';
import authRoutes from '../modules/auth/auth.routes.js';
import userRoutes from '../modules/users/user.routes.js';
import articleRoutes from '../modules/articles/article.routes.js';
import articleAdminRoutes from '../modules/articles/article.admin.routes.js';
import communityRoutes from '../modules/community/community.routes.js';
import propertyRoutes from '../modules/properties/property.routes.js';
import jobRoutes from '../modules/jobs/job.routes.js';
import taxonomyRoutes from '../modules/taxonomy/taxonomy.routes.js';
import taxonomyAdminRoutes from '../modules/taxonomy/taxonomy.admin.routes.js';
import mediaRoutes from '../modules/media/media.routes.js';
import commentRoutes from '../modules/comments/comment.routes.js';
import reactionRoutes from '../modules/reactions/reaction.routes.js';
import bookmarkRoutes from '../modules/bookmarks/bookmark.routes.js';
import followRoutes from '../modules/follows/follow.routes.js';
import {
  notificationRoutes,
  preferenceRoutes,
} from '../modules/notifications/notification.routes.js';
import reportRoutes from '../modules/reports/report.routes.js';
import searchRoutes from '../modules/search/search.routes.js';
import leadRoutes from '../modules/leads/lead.routes.js';
import systemRoutes from '../modules/system/system.routes.js';
import systemAdminRoutes from '../modules/system/system.admin.routes.js';
import moderationRoutes from '../modules/moderation/moderation.routes.js';
import googleWorkspaceRoutes from '../modules/googleWorkspace/googleWorkspace.routes.js';

const router = Router();
router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/articles', articleRoutes);
router.use('/community', communityRoutes);
router.use('/properties', propertyRoutes);
router.use('/jobs', jobRoutes);
router.use('/taxonomy', taxonomyRoutes);
router.use('/media', mediaRoutes);
router.use(commentRoutes);
router.use('/reactions', reactionRoutes);
router.use('/bookmarks', bookmarkRoutes);
router.use('/follows', followRoutes);
router.use('/notifications', notificationRoutes);
router.use('/notification-preferences', preferenceRoutes);
router.use('/reports', reportRoutes);
router.use('/search', searchRoutes);
router.use('/leads', leadRoutes);
router.use('/system', systemRoutes);
router.use('/admin/articles', articleAdminRoutes);
router.use('/admin/taxonomy', taxonomyAdminRoutes);
router.use('/admin/system', systemAdminRoutes);
router.use('/admin/google-workspace', googleWorkspaceRoutes);
router.use('/admin', moderationRoutes);

export default router;
