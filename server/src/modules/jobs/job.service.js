import Content from '../contents/content.model.js';
import JobPost from './jobPost.model.js';
import {
  createContentWithBody,
  getPublishedContentBySlug,
  getOwnedContentOrThrow,
  assertEditable,
  updateContentWithBody,
} from '../contents/content.service.js';
import { parsePagination, buildPaginationMeta } from '../../utils/pagination.js';
import ApiError from '../../utils/ApiError.js';
export async function list(q) {
  const { page, limit, skip } = parsePagination(q);
  const jf = { deadline: { $gte: new Date() } };
  if (q.type) jf.jobType = q.type;
  const ids = (await JobPost.find(jf).select('contentId').lean()).map((x) => x.contentId);
  const f = { _id: { $in: ids }, contentType: 'job', status: 'published', deletedAt: null };
  if (q.area) f.primaryAreaId = q.area;
  const [items, total] = await Promise.all([
    Content.find(f).sort({ publishedAt: -1 }).skip(skip).limit(limit).lean(),
    Content.countDocuments(f),
  ]);
  const ds = await JobPost.find({ contentId: { $in: items.map((i) => i._id) } }).lean();
  const m = new Map(ds.map((d) => [String(d.contentId), d]));
  return {
    items: items.map((i) => ({ ...i, job: m.get(String(i._id)) })),
    meta: buildPaginationMeta({ page, limit, total }),
  };
}
export async function detail(slug) {
  const b = await getPublishedContentBySlug(slug, 'job');
  const job = await JobPost.findOne({ contentId: b._id }).lean();
  return { ...b, job };
}
export async function create(userId, d) {
  if (new Date(d.deadline) <= new Date())
    throw new ApiError(422, 'Hạn nộp phải ở tương lai.', 'DEADLINE_INVALID');
  const c = await createContentWithBody({
    authorId: userId,
    contentType: 'job',
    ...d,
    status: 'draft',
  });
  await JobPost.create({ contentId: c._id, ...d });
  return c;
}
export async function update(id, userId, d) {
  const c = await getOwnedContentOrThrow(id, userId, 'job');
  assertEditable(c);
  await updateContentWithBody(c, d, userId, 'Job edit');
  await JobPost.findOneAndUpdate({ contentId: id }, d, { new: true, runValidators: true });
  return c;
}
export async function submit(id, userId) {
  const c = await getOwnedContentOrThrow(id, userId, 'job');
  c.status = 'pending_review';
  await c.save();
  return c;
}
