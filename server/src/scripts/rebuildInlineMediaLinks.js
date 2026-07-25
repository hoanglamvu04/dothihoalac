import 'dotenv/config';

import { connectDatabase, disconnectDatabase } from '../config/database.js';
import { logger } from '../config/logger.js';

import Content from '../modules/contents/content.model.js';
import ContentBody from '../modules/contents/contentBody.model.js';
import {
  syncInlineMediaLinks,
  validateInlineMediaHtml,
} from '../modules/media/inlineMedia.service.js';

async function rebuildInlineMediaLinks() {
  await connectDatabase();

  const articleIds = await Content.find({
    contentType: 'article',
    deletedAt: null,
  }).distinct('_id');

  const cursor = ContentBody.find({
    contentId: {
      $in: articleIds,
    },
  }).cursor();

  let updated = 0;
  let failed = 0;

  for await (const body of cursor) {
    try {
      const inlineMedia = await validateInlineMediaHtml(
        body.bodyHtml,
      );

      body.inlineMediaIds = inlineMedia.map(
        (item) => item.mediaId,
      );

      await body.save();
      await syncInlineMediaLinks(
        body.contentId,
        inlineMedia,
      );

      updated += 1;
    } catch (error) {
      failed += 1;

      logger.warn(
        {
          err: error,
          contentId: body.contentId,
          code: error?.code,
        },
        'Unable to rebuild inline media links for content',
      );
    }
  }

  logger.info(
    {
      updated,
      failed,
    },
    'Inline media link rebuild completed',
  );
}

try {
  await rebuildInlineMediaLinks();
} catch (error) {
  logger.fatal(
    {
      err: error,
    },
    'Inline media link rebuild failed',
  );

  process.exitCode = 1;
} finally {
  await disconnectDatabase();
}
