import Content from '../modules/contents/content.model.js';
import JobPost from '../modules/jobs/jobPost.model.js';
import { logger } from '../config/logger.js';
export async function expireJobPosts() {
  const rows = await JobPost.find({ deadline: { $lt: new Date() } })
    .select('contentId')
    .lean();
  if (!rows.length) return 0;
  const r = await Content.updateMany(
    { _id: { $in: rows.map((x) => x.contentId) }, status: 'published' },
    { $set: { status: 'expired' } },
  );
  if (r.modifiedCount) logger.info({ count: r.modifiedCount }, 'Expired job posts');
  return r.modifiedCount;
}
