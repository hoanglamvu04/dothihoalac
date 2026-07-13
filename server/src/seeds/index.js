import { connectDatabase, disconnectDatabase } from '../config/database.js';
import { logger } from '../config/logger.js';
import { seedRoles } from './seedRoles.js';
import { seedAdmin } from './seedAdmin.js';
import { seedCategories } from './seedCategories.js';
import { seedAreas } from './seedAreas.js';
async function run() {
  await connectDatabase();
  await seedRoles();
  await seedAdmin();
  await seedCategories();
  await seedAreas();
  logger.info('Seed completed');
  await disconnectDatabase();
}
run().catch(async (error) => {
  logger.error({ err: error }, 'Seed failed');
  await disconnectDatabase();
  process.exit(1);
});
