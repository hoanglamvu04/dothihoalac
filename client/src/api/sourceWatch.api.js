import { api, unwrap, unwrapList } from './http';

export const sourceWatchApi = {
  overview: async () => unwrap(await api.get('/admin/source-watch/overview')),
  sources: async () => unwrap(await api.get('/admin/source-watch/sources')),
  createSource: async (payload) => unwrap(await api.post('/admin/source-watch/sources', payload)),
  updateSource: async (id, payload) => unwrap(await api.patch(`/admin/source-watch/sources/${id}`, payload)),
  checkSource: async (id) => unwrap(await api.post(`/admin/source-watch/sources/${id}/check`)),
  items: async (params = {}) => unwrapList(await api.get('/admin/source-watch/items', { params })),
  updateItemStatus: async (id, status) =>
    unwrap(await api.patch(`/admin/source-watch/items/${id}/status`, { status })),
};
