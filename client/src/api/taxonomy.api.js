import { api, unwrap } from './http';

export const taxonomyApi = {
  bootstrap: async (config = {}) => unwrap(await api.get('/taxonomy/bootstrap', config)),
  categories: async (params = {}) => unwrap(await api.get('/taxonomy/categories', { params })),
  tags: async (params = {}) => unwrap(await api.get('/taxonomy/tags', { params })),
  areas: async (params = {}) => unwrap(await api.get('/taxonomy/areas', { params })),
};
