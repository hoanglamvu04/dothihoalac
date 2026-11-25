import mongoose from 'mongoose';
import SavedSearch from './savedSearch.model.js';
import Area from '../taxonomy/area.model.js';
import ApiError from '../../utils/ApiError.js';
import { normalizeSearchQuery } from '../../utils/vietnameseSearch.js';

export const SAVED_SEARCH_TYPES = new Set(['all', 'article', 'community', 'property', 'job']);
const MAX_SAVED_SEARCHES = 20;

export function parseSavedSearchInput(input = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new ApiError(422, 'Bộ lọc tìm kiếm không hợp lệ.', 'SAVED_SEARCH_INVALID');
  }
  const query = typeof input.query === 'string' ? input.query.trim().replace(/\s+/g, ' ') : '';
  const type = typeof input.contentType === 'string' ? input.contentType : 'all';
  const area = typeof input.area === 'string' ? input.area.trim() : '';
  if (query.length > 100 || area.length > 150 || !SAVED_SEARCH_TYPES.has(type)) {
    throw new ApiError(422, 'Bộ lọc tìm kiếm không hợp lệ.', 'SAVED_SEARCH_INVALID');
  }
  if (query && query.length < 2) {
    throw new ApiError(422, 'Nhập từ khóa ít nhất 2 ký tự.', 'SAVED_SEARCH_QUERY_SHORT');
  }
  if (!query && !area) {
    throw new ApiError(422, 'Cần từ khóa hoặc khu vực để theo dõi.', 'SAVED_SEARCH_EMPTY');
  }
  const queryNormalized = normalizeSearchQuery(query);
  if (query && !queryNormalized) {
    throw new ApiError(422, 'Từ khóa không hợp lệ.', 'SAVED_SEARCH_INVALID');
  }
  return { query, queryNormalized, contentType: type, area };
}

async function resolveArea(input) {
  if (!input) return null;
  const filter = mongoose.isValidObjectId(input)
    ? { _id: input, isActive: true }
    : { slug: input.toLowerCase(), isActive: true };
  const area = await Area.findOne(filter).select('_id name slug').lean();
  if (!area) throw new ApiError(422, 'Không tìm thấy khu vực.', 'SAVED_SEARCH_AREA_INVALID');
  return area;
}

export async function listSavedSearches(userId) {
  return SavedSearch.find({ userId })
    .select('-lastScannedContentId')
    .sort({ createdAt: -1 })
    .limit(MAX_SAVED_SEARCHES)
    .lean();
}

export async function createSavedSearch(userId, input) {
  const parsed = parseSavedSearchInput(input);
  const area = await resolveArea(parsed.area);
  const key = {
    userId,
    queryNormalized: parsed.queryNormalized,
    contentType: parsed.contentType,
    areaId: area?._id || null,
  };

  const existing = await SavedSearch.findOne(key);
  if (existing) {
    if (!existing.isActive) {
      existing.isActive = true;
      existing.lastScannedAt = new Date();
      existing.lastScannedContentId = null;
      existing.lastScanAttemptAt = null;
      existing.scanLeaseToken = null;
      existing.scanLeaseUntil = null;
      await existing.save();
    }
    return existing;
  }

  if (await SavedSearch.countDocuments({ userId }) >= MAX_SAVED_SEARCHES) {
    throw new ApiError(409, 'Mỗi tài khoản theo dõi tối đa 20 tìm kiếm.', 'SAVED_SEARCH_LIMIT');
  }

  try {
    return await SavedSearch.create({
      ...key,
      query: parsed.query,
      areaName: area?.name || '',
      areaSlug: area?.slug || '',
      isActive: true,
      lastScannedAt: new Date(),
    });
  } catch (error) {
    if (error?.code === 11000) return SavedSearch.findOne(key);
    throw error;
  }
}

export async function setSavedSearchActive(userId, id, active) {
  if (!mongoose.isValidObjectId(id) || typeof active !== 'boolean') {
    throw new ApiError(422, 'Yêu cầu không hợp lệ.', 'SAVED_SEARCH_INVALID');
  }
  const search = await SavedSearch.findOneAndUpdate(
    { _id: id, userId },
    {
      $set: {
        isActive: active,
        // Invalidate in-flight workers on pause, resume or an explicit retry.
        scanLeaseToken: null,
        scanLeaseUntil: null,
        ...(active ? {
          lastScannedAt: new Date(),
          lastScannedContentId: null,
          lastScanAttemptAt: null,
        } : {}),
      },
    },
    { new: true },
  );
  if (!search) throw new ApiError(404, 'Không tìm thấy tìm kiếm đã lưu.', 'SAVED_SEARCH_NOT_FOUND');
  return search;
}

export async function deleteSavedSearch(userId, id) {
  if (!mongoose.isValidObjectId(id)) {
    throw new ApiError(422, 'Mã tìm kiếm không hợp lệ.', 'SAVED_SEARCH_INVALID');
  }
  const removed = await SavedSearch.findOneAndDelete({ _id: id, userId });
  if (!removed) throw new ApiError(404, 'Không tìm thấy tìm kiếm đã lưu.', 'SAVED_SEARCH_NOT_FOUND');
  return { deleted: true, id };
}
