import { api, unwrap } from './http';

export const systemApi = {
  homeFeed: async (config = {}) =>
    unwrap(await api.get('/system/home-feed', config)),

  banners: async (slotKey, device = 'all', limit = 4) =>
    unwrap(
      await api.get('/system/banners', {
        params: {
          slotKey,
          device,
          limit,
        },
      }),
    ),

  bannerImpression: async (id) =>
    unwrap(await api.post(`/system/banners/${id}/impression`)),

  bannerClick: async (id) =>
    unwrap(await api.post(`/system/banners/${id}/click`)),
};
