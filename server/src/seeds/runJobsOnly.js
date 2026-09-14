import {
  connectDatabase,
  disconnectDatabase,
} from '../config/database.js';

import { configureDnsServers } from '../config/dns.js';
import { logger } from '../config/logger.js';
import Content from '../modules/contents/content.model.js';

import { seedRoles } from './seedRoles.js';
import { seedAreas } from './seedAreas.js';
import { seedCategories } from './seedCategories.js';
import { seedTags } from './seedTags.js';
import { seedAdmin } from './seedAdmin.js';
import { seedMedia } from './seedMedia.js';
import { seedJobShowcase } from './seedJobShowcase.js';
import { assertDemoSeedAllowed } from './seedSafety.js';

async function run() {
  assertDemoSeedAllowed('the jobs showcase seed');

  const dnsServers = configureDnsServers();
  logger.info({ dnsServers }, 'DNS configured for job showcase seed runner');
  logger.info('Starting non-destructive job showcase seed');

  await connectDatabase();

  const jobCountBefore = await Content.countDocuments({
    contentType: 'job',
    deletedAt: null,
  });

  /*
   * Chỉ upsert dependency cần cho 15 tin việc làm showcase.
   * Không gọi seedUsers() và không gọi seedJobs() ở runner độc lập này để:
   * - không thay đổi tài khoản demo hoặc nội dung đã có;
   * - không khiến production safety guard quarantine các tin vừa seed;
   * - chạy lại nhiều lần chỉ cập nhật đúng 15 slug showcase.
   */
  await seedRoles();

  const [areas, categories, tags] = await Promise.all([
    seedAreas(),
    seedCategories(),
    seedTags(),
  ]);

  const adminUser = await seedAdmin();
  const users = { admin: adminUser };
  const media = await seedMedia({ users });

  const showcaseJobs = await seedJobShowcase({
    users,
    categories,
    areas,
    tags,
    media,
  });

  const jobCountAfter = await Content.countDocuments({
    contentType: 'job',
    deletedAt: null,
  });

  if (jobCountAfter < jobCountBefore) {
    throw new Error(
      `Job showcase seed safety check failed: count dropped from ${jobCountBefore} to ${jobCountAfter}`,
    );
  }

  logger.info(
    {
      showcaseCount: Object.keys(showcaseJobs || {}).length,
      jobCountBefore,
      jobCountAfter,
      slugs: Object.keys(showcaseJobs || {}),
    },
    'Non-destructive job showcase seed completed',
  );

  await disconnectDatabase();
}

run().catch(async (error) => {
  logger.error({ err: error }, 'Job showcase seed failed');
  await disconnectDatabase().catch(() => null);
  process.exit(1);
});
