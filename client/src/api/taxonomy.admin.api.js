import { api, unwrap } from './http';

export const taxonomyAdminApi = {
  list: async (type, params = {}) =>
    unwrap(await api.get(`/admin/taxonomy/${type}`, { params })),
  create: async (type, payload) =>
    unwrap(await api.post(`/admin/taxonomy/${type}`, payload)),
  update: async (type, id, payload) =>
    unwrap(await api.patch(`/admin/taxonomy/${type}/${id}`, payload)),
  deactivate: async (type, id) =>
    unwrap(await api.delete(`/admin/taxonomy/${type}/${id}`)),
};
