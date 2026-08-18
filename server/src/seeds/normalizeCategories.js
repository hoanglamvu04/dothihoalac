import { configureDnsServers } from '../config/dns.js';
import { connectDatabase, disconnectDatabase } from '../config/database.js';
import { logger } from '../config/logger.js';
import Category from '../modules/taxonomy/category.model.js';
import Content from '../modules/contents/content.model.js';
import { categoryDefinitions, seedCategories } from './seedCategories.js';

const dryRun = process.argv.includes('--dry-run');

const legacyAliases = [
  ['article', 'bat-dong-san', 'article', 'bat-dong-san-hoa-lac'],
  ['article', 'khu-cong-nghe-cao', 'article', 'khoa-hoc-cong-nghe'],
  ['article', 'chinh-sach-hanh-chinh', 'article', 'hanh-chinh'],
  ['article', 'doi-song-cu-dan', 'article', 'doi-song-dan-cu'],
  ['article', 'kien-truc-xay-dung', 'article', 'du-an-dtxd'],
  ['article', 'du-lich-nghi-duong', 'article', 'doi-song-dan-cu'],
  ['article', 'su-kien', 'article', 'doi-song-dan-cu'],
  ['article', 'an-ninh-canh-bao', 'article', 'doi-song-dan-cu'],
  ['all', 'quy-hoach', 'article', 'quy-hoach'],
  ['all', 'quy-hoach-ha-tang', 'article', 'quy-hoach'],
  ['all', 'ha-tang-giao-thong', 'article', 'ha-tang-giao-thong'],
  ['all', 'du-an-dtxd', 'article', 'du-an-dtxd'],
  ['all', 'bat-dong-san', 'article', 'bat-dong-san-hoa-lac'],
  ['all', 'khoa-hoc-cong-nghe', 'article', 'khoa-hoc-cong-nghe'],
  ['all', 'giao-duc', 'article', 'giao-duc'],
  ['all', 'doi-song-cu-dan', 'article', 'doi-song-dan-cu'],
  ['all', 'doi-song-dan-cu', 'article', 'doi-song-dan-cu'],
  ['all', 'chinh-sach-hanh-chinh', 'article', 'hanh-chinh'],
  ['all', 'kinh-te-doanh-nghiep', 'article', 'kinh-te-doanh-nghiep'],
];

function canonicalKeys() {
  return new Set(
    Object.entries(categoryDefinitions).flatMap(([scope, items]) =>
      items.map((item) => `${scope}:${item.slug}`),
    ),
  );
}

async function moveCategoryReferences(source, target, contentType) {
  const primaryFilter = {
    contentType,
    primaryCategoryId: source._id,
  };
  const listFilter = {
    contentType,
    categoryIds: source._id,
  };

  const primaryCount = await Content.countDocuments(primaryFilter);
  const listCount = await Content.countDocuments(listFilter);

  if (dryRun) {
    return { primaryCount, listCount, modified: 0 };
  }

  const primaryResult = await Content.updateMany(primaryFilter, {
    $set: { primaryCategoryId: target._id },
  });

  await Content.updateMany(listFilter, {
    $addToSet: { categoryIds: target._id },
  });
  const listResult = await Content.updateMany(listFilter, {
    $pull: { categoryIds: source._id },
  });

  await Category.updateOne(
    { _id: source._id },
    {
      $set: {
        isActive: false,
        description: `Danh mục cũ. Dữ liệu đã được chuẩn hóa sang “${target.name}”.`,
      },
    },
  );

  return {
    primaryCount,
    listCount,
    modified: Number(primaryResult.modifiedCount || 0) + Number(listResult.modifiedCount || 0),
  };
}

async function normalizeAliases() {
  const changes = [];

  for (const [fromScope, fromSlug, toScope, toSlug] of legacyAliases) {
    const source = await Category.findOne({ contentScope: fromScope, slug: fromSlug });
    const target = await Category.findOne({ contentScope: toScope, slug: toSlug });

    if (!source || !target || String(source._id) === String(target._id)) {
      continue;
    }

    const counts = await moveCategoryReferences(source, target, toScope);
    changes.push({
      from: `${fromScope}:${fromSlug}`,
      to: `${toScope}:${toSlug}`,
      ...counts,
    });
  }

  return changes;
}

async function deactivateNonCanonical() {
  const allowed = canonicalKeys();
  const categories = await Category.find({}).sort({ contentScope: 1, displayOrder: 1, name: 1 });
  const legacy = [];

  for (const category of categories) {
    const key = `${category.contentScope}:${category.slug}`;
    if (allowed.has(key)) {
      continue;
    }

    const primaryCount = await Content.countDocuments({ primaryCategoryId: category._id });
    const secondaryCount = await Content.countDocuments({ categoryIds: category._id });

    legacy.push({
      key,
      name: category.name,
      primaryCount,
      secondaryCount,
      wasActive: category.isActive,
    });

    if (!dryRun && category.isActive) {
      await Category.updateOne(
        { _id: category._id },
        {
          $set: {
            isActive: false,
            description: category.description || 'Danh mục cũ đã được tắt sau khi chuẩn hóa taxonomy.',
          },
        },
      );
    }
  }

  return legacy;
}

async function run() {
  const dnsServers = configureDnsServers();
  logger.info({ dnsServers, dryRun }, 'DNS configured for taxonomy normalization');

  await connectDatabase();

  if (!dryRun) {
    await seedCategories();
  }

  const aliasChanges = await normalizeAliases();
  const legacyCategories = await deactivateNonCanonical();

  const canonicalSummary = Object.fromEntries(
    Object.entries(categoryDefinitions).map(([scope, items]) => [scope, items.length]),
  );

  logger.info(
    {
      mode: dryRun ? 'dry-run' : 'apply',
      canonicalSummary,
      aliasChanges,
      legacyCategories,
    },
    dryRun
      ? 'Taxonomy normalization preview completed'
      : 'Taxonomy normalization completed',
  );

  await disconnectDatabase();
}

run().catch(async (error) => {
  logger.error({ err: error }, 'Taxonomy normalization failed');
  await disconnectDatabase().catch(() => null);
  process.exit(1);
});
