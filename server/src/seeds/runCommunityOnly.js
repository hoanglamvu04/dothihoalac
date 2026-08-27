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
import { seedCommunityPosts } from './seedCommunityPosts.js';

async function run() {
  const dnsServers = configureDnsServers();
  logger.info({ dnsServers }, 'DNS configured for community seed runner');
  logger.info('Starting community seed');

  await connectDatabase();
  await seedRoles();

  const [areas, categories, tags] = await Promise.all([
    seedAreas(),
    seedCategories(),
    seedTags(),
  ]);

  const adminUser = await seedAdmin();
  const users = await seedUsers({ areas, adminUser });
  const media = await seedMedia({ users });

  const community = await seedCommunityPosts({
    users,
    categories,
    areas,
    tags,
    media,
  });

  logger.info(
    {
      count: Object.keys(community || {}).length,
      slugs: Object.keys(community || {}),
    },
    'Community seed completed',
  );

  await disconnectDatabase();
}

run().catch(async (error) => {
  logger.error({ err: error }, 'Community seed failed');
  await disconnectDatabase().catch(() => null);
  process.exit(1);
});
