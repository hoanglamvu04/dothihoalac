import User from './user.model.js';
import UserProfile from './userProfile.model.js';
import UserSession from './userSession.model.js';
import UsernameHistory from './usernameHistory.model.js';
import Content from '../contents/content.model.js';
import Bookmark from '../bookmarks/bookmark.model.js';
import Report from '../reports/report.model.js';
import { env } from '../../config/env.js';
import { parsePagination, buildPaginationMeta } from '../../utils/pagination.js';
import ApiError from '../../utils/ApiError.js';

export async function getPublicProfile(username) {
  const user = await User.findOne({
    username: username.toLowerCase(),
    deletedAt: null,
    status: { $ne: 'banned' },
  }).lean();
  if (!user) throw new ApiError(404, 'Không tìm thấy thành viên.', 'USER_NOT_FOUND');
  const profile = await UserProfile.findOne({ userId: user._id, publicProfile: true })
    .populate('avatarMediaId coverMediaId areaId')
    .lean();
  if (!profile) throw new ApiError(404, 'Hồ sơ không công khai.', 'PROFILE_PRIVATE');
  const [postCount, listingCount] = await Promise.all([
    Content.countDocuments({ authorId: user._id, status: 'published', deletedAt: null }),
    Content.countDocuments({
      authorId: user._id,
      contentType: 'property',
      status: 'published',
      deletedAt: null,
    }),
  ]);
  return {
    user: {
      id: user._id,
      username: user.username,
      displayName: user.displayName,
      emailVerifiedAt: user.emailVerifiedAt,
      phoneVerifiedAt: user.phoneVerifiedAt,
      createdAt: user.createdAt,
    },
    profile,
    counts: { postCount, listingCount },
  };
}
export async function getPrivateProfile(userId) {
  return UserProfile.findOne({ userId }).populate('avatarMediaId coverMediaId areaId').lean();
}
export async function updateProfile(user, data) {
  if (data.displayName !== undefined) {
    user.displayName = data.displayName;
    await user.save();
  }
  const profileData = { ...data };
  delete profileData.displayName;
  return UserProfile.findOneAndUpdate({ userId: user._id }, profileData, {
    new: true,
    upsert: true,
    runValidators: true,
  }).populate('avatarMediaId coverMediaId areaId');
}
export async function changeUsername(user, username) {
  const exists = await User.exists({ username, _id: { $ne: user._id } });
  if (exists) throw new ApiError(409, 'Tên người dùng đã tồn tại.', 'USERNAME_EXISTS');
  const latest = await UsernameHistory.findOne({ userId: user._id }).sort({ changedAt: -1 }).lean();
  const cooldown = env.USERNAME_CHANGE_COOLDOWN_DAYS * 24 * 60 * 60 * 1000;
  if (latest && Date.now() - new Date(latest.changedAt).getTime() < cooldown)
    throw new ApiError(
      429,
      `Bạn chỉ được đổi tên người dùng mỗi ${env.USERNAME_CHANGE_COOLDOWN_DAYS} ngày.`,
      'USERNAME_COOLDOWN',
    );
  const oldUsername = user.username;
  user.username = username;
  await user.save();
  await UsernameHistory.create({ userId: user._id, oldUsername, newUsername: username });
  return { username };
}
export async function listSessions(userId) {
  return UserSession.find({ userId, revokedAt: null, expiresAt: { $gt: new Date() } })
    .select('-refreshTokenHash')
    .sort({ lastActiveAt: -1 })
    .lean();
}
export async function revokeSession(userId, sessionId) {
  const result = await UserSession.updateOne({ _id: sessionId, userId }, { revokedAt: new Date() });
  if (!result.matchedCount)
    throw new ApiError(404, 'Không tìm thấy phiên đăng nhập.', 'SESSION_NOT_FOUND');
}
async function listContents(userId, query, contentType) {
  const { page, limit, skip } = parsePagination(query);
  const filter = { authorId: userId, deletedAt: null, ...(contentType ? { contentType } : {}) };
  if (query.status) filter.status = query.status;
  const [items, total] = await Promise.all([
    Content.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Content.countDocuments(filter),
  ]);
  return { items, meta: buildPaginationMeta({ page, limit, total }) };
}
export const listMyPosts = (userId, query) => listContents(userId, query);
export const listMyListings = (userId, query) => listContents(userId, query, 'property');
export async function listMyBookmarks(userId, query) {
  const { page, limit, skip } = parsePagination(query);
  const [items, total] = await Promise.all([
    Bookmark.find({ userId })
      .populate('contentId')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Bookmark.countDocuments({ userId }),
  ]);
  return { items, meta: buildPaginationMeta({ page, limit, total }) };
}
export async function listMyReports(userId, query) {
  const { page, limit, skip } = parsePagination(query);
  const [items, total] = await Promise.all([
    Report.find({ reporterId: userId }).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Report.countDocuments({ reporterId: userId }),
  ]);
  return { items, meta: buildPaginationMeta({ page, limit, total }) };
}
