import { api, unwrap } from './http';

const BANNER_CACHE_TTL_MS = 30_000;
const bannerCache = new Map();
const bannerInFlight = new Map();

function bannerCacheKey(slotKey, device, limit) {
  return `${String(slotKey || '')}|${String(device || 'all')}|${Number(limit || 4)}`;
}

async function getBanners(slotKey, device = 'all', limit = 4) {
  const key = bannerCacheKey(slotKey, device, limit);
  const cached = bannerCache.get(key);
  const now = Date.now();

  if (cached && now - cached.savedAt < BANNER_CACHE_TTL_MS) {
    return cached.items;
  }

  if (cached) bannerCache.delete(key);

  const pending = bannerInFlight.get(key);
  if (pending) return pending;

  const request = api
    .get('/system/banners', {
      params: {
        slotKey,
        device,
        limit,
      },
    })
    .then((response) => {
      const items = unwrap(response);
      const normalized = Array.isArray(items) ? items : [];

      bannerCache.set(key, {
        savedAt: Date.now(),
        items: normalized,
      });

      if (bannerCache.size > 32) {
        const oldestKey = bannerCache.keys().next().value;
        if (oldestKey !== undefined) bannerCache.delete(oldestKey);
      }

      return normalized;
    })
    .finally(() => {
      bannerInFlight.delete(key);
    });

  bannerInFlight.set(key, request);
  return request;
}

export const systemApi = {
  banners: getBanners,

  bannerImpression: async (id) =>
    unwrap(await api.post(`/system/banners/${id}/impression`)),

  bannerClick: async (id) =>
    unwrap(await api.post(`/system/banners/${id}/click`)),
};
