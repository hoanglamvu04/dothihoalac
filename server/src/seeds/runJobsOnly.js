import {
  connectDatabase,
  disconnectDatabase,
} from '../config/database.js';

import { configureDnsServers } from '../config/dns.js';
import { logger } from '../config/logger.js';

import { seedRoles } from './seedRoles.js';
import { seedAreas } from './seedAreas.js';
import { seedCategories } from './seedCategories.js';
import { seedTags } from './seedTags.js';
import { seedAdmin } from './seedAdmin.js';
import { seedUsers } from './seedUsers.js';
import { seedMedia } from './seedMedia.js';
import { seedJobs } from './seedJobs.js';

async function run() {
  const dnsServers = configureDnsServers();
  logger.info({ dnsServers }, 'DNS configured for job seed runner');
  logger.info('Starting job seed');

  await connectDatabase();

  // Các seed phụ thuộc đều dùng upsert nên có thể chạy lặp lại an toàn.
  await seedRoles();

  const [areas, categories, tags] = await Promise.all([
    seedAreas(),
    seedCategories(),
    seedTags(),
  ]);

  const adminUser = await seedAdmin();
  const users = await seedUsers({ areas, adminUser });
  const media = await seedMedia({ users });

  const jobs = await seedJobs({
    users,
    categories,
    areas,
    tags,
    media,
  });

  logger.info(
    {
      count: Object.keys(jobs || {}).length,
      slugs: Object.keys(jobs || {}),
    },
    'Job seed completed',
  );

  await disconnectDatabase();
}

run().catch(async (error) => {
  logger.error({ err: error }, 'Job seed failed');
  await disconnectDatabase().catch(() => null);
  process.exit(1);
});
