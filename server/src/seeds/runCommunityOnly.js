import { connectDatabase, disconnectDatabase } from '../config/database.js';
import { seedRoles } from './seedRoles.js';
import { seedAreas } from './seedAreas.js';
import { seedCategories } from './seedCategories.js';
import { seedTags } from './seedTags.js';
import { seedAdmin } from './seedAdmin.js';
import { seedUsers } from './seedUsers.js';
import { seedMedia } from './seedMedia.js';
import { seedCommunityPosts } from './seedCommunityPosts.js';

async function run() {
  await connectDatabase();
  await seedRoles();
  const [areas, categories, tags] = await Promise.all([seedAreas(), seedCategories(), seedTags()]);
  const adminUser = await seedAdmin();
  const users = await seedUsers({ areas, adminUser });
  const media = await seedMedia({ users });
  await seedCommunityPosts({ users, categories, areas, tags, media });
  await disconnectDatabase();
}

run().catch(async (error) => {
  console.error(error);
  await disconnectDatabase();
  process.exit(1);
});
