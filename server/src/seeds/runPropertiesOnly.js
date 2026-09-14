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
import { seedPropertyFeatures } from './seedPropertyFeatures.js';
import { seedAdmin } from './seedAdmin.js';
import { seedMedia } from './seedMedia.js';
import { seedPropertyShowcase } from './seedPropertyShowcase.js';
import { assertDemoSeedAllowed } from './seedSafety.js';

async function run() {
  assertDemoSeedAllowed('the property showcase seed');

  const dnsServers = configureDnsServers();
  logger.info({ dnsServers }, 'DNS configured for property showcase seed runner');

  logger.info('Starting non-destructive property showcase seed');

  await connectDatabase();

  const propertyCountBefore = await Content.countDocuments({
    contentType: 'property',
    deletedAt: null,
  });

  /*
   * Chỉ upsert các dependency cần cho 15 tin showcase.
   * Không gọi seedUsers() và không gọi seedProperties() ở runner này:
   * - tránh thay đổi trạng thái/profile của tài khoản demo;
   * - tránh chạm vào các tin BĐS seed cũ hoặc tin người dùng đã tạo;
   * - chạy lại nhiều lần chỉ cập nhật đúng 15 slug showcase.
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

  const adminUser = await seedAdmin();

  /*
   * seedPropertyShowcase dùng các key author resident/broker/business để tạo
   * dữ liệu đa dạng. Với runner độc lập, tất cả các key được ánh xạ về admin
   * thật của hệ thống để production safety guard không quarantine 15 tin mẫu.
   */
  const users = {
    admin: adminUser,
    resident: adminUser,
    broker: adminUser,
    business: adminUser,
    member: adminUser,
  };

  const media = await seedMedia({ users });

  const showcaseProperties = await seedPropertyShowcase({
    users,
    categories,
    areas,
    tags,
    media,
    propertyFeatures,
  });

  const propertyCountAfter = await Content.countDocuments({
    contentType: 'property',
    deletedAt: null,
  });

  if (propertyCountAfter < propertyCountBefore) {
    throw new Error(
      `Property showcase seed safety check failed: count dropped from ${propertyCountBefore} to ${propertyCountAfter}`,
    );
  }

  logger.info(
    {
      showcaseCount: Object.keys(showcaseProperties || {}).length,
      propertyCountBefore,
      propertyCountAfter,
      slugs: Object.keys(showcaseProperties || {}),
    },
    'Non-destructive property showcase seed completed',
  );

  await disconnectDatabase();
}

run().catch(async (error) => {
  logger.error(
    {
      err: error,
    },
    'Property showcase seed failed',
  );

  await disconnectDatabase().catch(() => null);
  process.exit(1);
});
