import {
  connectDatabase,
  disconnectDatabase,
} from '../config/database.js';

import { configureDnsServers } from '../config/dns.js';
import { logger } from '../config/logger.js';
import Project from '../modules/projects/project.model.js';

import { seedRoles } from './seedRoles.js';
import { seedAreas } from './seedAreas.js';
import { seedAdmin } from './seedAdmin.js';
import { seedProjectShowcase } from './seedProjectShowcase.js';
import { assertDemoSeedAllowed } from './seedSafety.js';

async function run() {
  assertDemoSeedAllowed('the project tracker showcase seed');

  const dnsServers = configureDnsServers();
  logger.info({ dnsServers }, 'DNS configured for Project Tracker seed runner');
  logger.info('Starting non-destructive Project Tracker showcase seed');

  await connectDatabase();

  const projectCountBefore = await Project.countDocuments({ deletedAt: null });

  /*
   * Runner này chỉ upsert taxonomy khu vực, admin và đúng 12 mã Project Tracker
   * DTHL-PRJ-001..012. Không seed demo users, không reset database và không
   * xóa/chỉnh sửa các dự án ngoài tập showcase.
   */
  await seedRoles();
  const areas = await seedAreas();
  const adminUser = await seedAdmin();

  const showcaseProjects = await seedProjectShowcase({ adminUser, areas });

  const projectCountAfter = await Project.countDocuments({ deletedAt: null });

  if (projectCountAfter < projectCountBefore) {
    throw new Error(
      `Project Tracker seed safety check failed: count dropped from ${projectCountBefore} to ${projectCountAfter}`,
    );
  }

  logger.info(
    {
      showcaseCount: Object.keys(showcaseProjects || {}).length,
      projectCountBefore,
      projectCountAfter,
      codes: Object.keys(showcaseProjects || {}),
    },
    'Non-destructive Project Tracker showcase seed completed',
  );

  await disconnectDatabase();
}

run().catch(async (error) => {
  logger.error({ err: error }, 'Project Tracker showcase seed failed');
  await disconnectDatabase().catch(() => null);
  process.exit(1);
});
