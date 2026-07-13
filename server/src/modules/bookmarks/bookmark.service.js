import Bookmark from './bookmark.model.js';
import Content from '../contents/content.model.js';
import ApiError from '../../utils/ApiError.js';
export async function put(userId, contentId) {
  if (!(await Content.exists({ _id: contentId, status: 'published', deletedAt: null })))
    throw new ApiError(404, 'Không tìm thấy nội dung.', 'CONTENT_NOT_FOUND');
  const before = await Bookmark.findOne({ userId, contentId });
  if (before) return before;
  const b = await Bookmark.create({ userId, contentId });
  await Content.updateOne({ _id: contentId }, { $inc: { bookmarkCount: 1 } });
  return b;
}
export async function remove(userId, contentId) {
  const b = await Bookmark.findOneAndDelete({ userId, contentId });
  if (b) await Content.updateOne({ _id: contentId }, { $inc: { bookmarkCount: -1 } });
  return b;
}
