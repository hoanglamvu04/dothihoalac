import dns from 'node:dns';

import {
  connectDatabase,
  disconnectDatabase,
} from '../config/database.js';

import { logger } from '../config/logger.js';

import { seedRoles } from './seedRoles.js';
import { seedAreas } from './seedAreas.js';
import { seedCategories } from './seedCategories.js';
import { seedTags } from './seedTags.js';
import { seedPropertyFeatures } from './seedPropertyFeatures.js';
import { seedAdmin } from './seedAdmin.js';
import { seedUsers } from './seedUsers.js';
import { seedMedia } from './seedMedia.js';
import { seedProperties } from './seedProperties.js';

/*
 * Ép Node ưu tiên hai DNS công cộng khi phân giải
 * bản ghi SRV của MongoDB Atlas.
 */
dns.setServers([
  '1.1.1.1',
  '8.8.8.8',
]);

async function run() {
  logger.info(
    'Starting property seed',
  );

  await connectDatabase();

  /*
   * Các seed dưới đây là dữ liệu phụ thuộc mà
   * seedProperties cần. Chúng sử dụng upsert nên
   * chạy lại không tạo dữ liệu trùng.
   */
  await seedRoles();

  const [
    areas,
    categories,
    tags,
    propertyFeatures,
  ] = await Promise.all([
    seedAreas(),
    seedCategories(),
    seedTags(),
    seedPropertyFeatures(),
  ]);

  const adminUser =
    await seedAdmin();

  const users =
    await seedUsers({
      areas,
      adminUser,
    });

  const media =
    await seedMedia({
      users,
    });

  const properties =
    await seedProperties({
      users,
      categories,
      areas,
      tags,
      media,
      propertyFeatures,
    });

  logger.info(
    {
      count:
        Object.keys(
          properties || {},
        ).length,

      slugs:
        Object.keys(
          properties || {},
        ),
    },
    'Property seed completed',
  );

  await disconnectDatabase();
}

run().catch(async (error) => {
  logger.error(
    {
      err: error,
    },
    'Property seed failed',
  );

  await disconnectDatabase().catch(
    () => null,
  );

  process.exit(1);
});