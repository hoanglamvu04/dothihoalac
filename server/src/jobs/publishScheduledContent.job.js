import Content from '../modules/contents/content.model.js';
import { logger } from '../config/logger.js';
export async function publishScheduledContent() {
  const now = new Date();
  const result = await Content.updateMany(
    { status: 'scheduled', scheduledAt: { $lte: now }, deletedAt: null },
    { $set: { status: 'published', publishedAt: now } },
  );
  if (result.modifiedCount)
    logger.info({ count: result.modifiedCount }, 'Published scheduled content');
  return result.modifiedCount;
}
