import { logger } from '../config/logger.js';
import { seedRoles } from './seedRoles.js';
import { seedAreas } from './seedAreas.js';
import { seedCategories } from './seedCategories.js';
import { seedTags } from './seedTags.js';
import { seedPropertyFeatures } from './seedPropertyFeatures.js';
import { seedAdmin } from './seedAdmin.js';
import { seedUsers } from './seedUsers.js';
import { seedMedia } from './seedMedia.js';
import { seedArticles } from './seedArticles.js';
import { seedCommunityPosts } from './seedCommunityPosts.js';
import { seedProperties } from './seedProperties.js';
import { seedJobs } from './seedJobs.js';
import { seedInteractions } from './seedInteractions.js';
import { seedNotifications } from './seedNotifications.js';
import { seedModeration } from './seedModeration.js';
import { seedLeads } from './seedLeads.js';
import { seedSystem } from './seedSystem.js';
import { buildSeedSummary } from './seedSummary.js';
import { DEMO_PASSWORD } from './seedHelpers.js';

export async function runSeed({ includeDemo = true } = {}) {
  logger.info('Seeding roles and permissions');
  await seedRoles();

  logger.info('Seeding taxonomy and property features');
  const [areas, categories, tags, propertyFeatures] = await Promise.all([
    seedAreas(),
    seedCategories(),
    seedTags(),
    seedPropertyFeatures(),
  ]);

  logger.info('Seeding administrator');
  const adminUser = await seedAdmin();

  if (!includeDemo) {
    const summary = await buildSeedSummary();
    return { summary, demoPassword: null };
  }

  logger.info('Seeding demo users and media');
  const users = await seedUsers({ areas, adminUser });
  const media = await seedMedia({ users });

  logger.info('Seeding articles, community, properties and jobs');
  const articles = await seedArticles({ users, categories, areas, tags, media });
  const community = await seedCommunityPosts({ users, categories, areas, tags, media });
  const properties = await seedProperties({
    users,
    categories,
    areas,
    tags,
    media,
    propertyFeatures,
  });
  const jobs = await seedJobs({ users, categories, areas, tags, media });

  logger.info('Seeding interactions, notifications, moderation and leads');
  await seedInteractions({ users, articles, community, properties, areas, categories, tags });
  await seedNotifications({ users, articles, community });
  await seedModeration({ users, articles, community, properties });
  await seedLeads({ users, areas, articles, properties });
  await seedSystem({ users, media });

  const summary = await buildSeedSummary();
  return {
    summary,
    demoPassword: DEMO_PASSWORD,
    demoAccounts: {
      editor: 'bientap@dothihoalac.vn',
      moderator: 'kiemduyet@dothihoalac.vn',
      resident: 'cudan@example.com',
      student: 'sinhvien@example.com',
      broker: 'moigioi@example.com',
      business: 'doanhnghiep@example.com',
      member: 'thanhvien@example.com',
    },
    jobsCount: Object.keys(jobs).length,
  };
}
