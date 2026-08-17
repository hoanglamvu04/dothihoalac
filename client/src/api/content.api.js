import { api, unwrap, unwrapList } from './http';

export const articleApi = {
  list: async (params = {}) => unwrapList(await api.get('/articles', { params })),
  detail: async (slug) => unwrap(await api.get(`/articles/${slug}`)),
  submitTip: async (payload) => unwrap(await api.post('/articles/tips', payload)),
};

export const communityApi = {
  list: async (params = {}) => unwrapList(await api.get('/community', { params })),
  detail: async (slug) => unwrap(await api.get(`/community/${slug}`)),
  editDetail: async (id) => unwrap(await api.get(`/community/${id}/edit`)),
  create: async (payload) => unwrap(await api.post('/community', payload)),
  update: async (id, payload) => unwrap(await api.patch(`/community/${id}`, payload)),
  remove: async (id) => api.delete(`/community/${id}`),
  submit: async (id) => unwrap(await api.post(`/community/${id}/submit`)),
  acceptAnswer: async (id, commentId) =>
    unwrap(await api.post(`/community/${id}/accept-answer`, { commentId })),
};

export const propertyApi = {
  list: async (params = {}) => unwrapList(await api.get('/properties', { params })),
  detail: async (slug) => unwrap(await api.get(`/properties/${slug}`)),
  create: async (payload) => unwrap(await api.post('/properties', payload)),
  update: async (id, payload) => unwrap(await api.patch(`/properties/${id}`, payload)),
  submit: async (id) => unwrap(await api.post(`/properties/${id}/submit`)),
  renew: async (id) => unwrap(await api.post(`/properties/${id}/renew`)),
  markSold: async (id) => unwrap(await api.post(`/properties/${id}/mark-sold`)),
  markRented: async (id) => unwrap(await api.post(`/properties/${id}/mark-rented`)),
  contact: async (id, contactType) =>
    unwrap(await api.post(`/properties/${id}/contact-events`, { contactType })),
};

export const jobApi = {
  list: async (params = {}) => unwrapList(await api.get('/jobs', { params })),
  detail: async (slug) => unwrap(await api.get(`/jobs/${slug}`)),
  editDetail: async (id) => unwrap(await api.get(`/jobs/${id}/edit`)),
  create: async (payload) => unwrap(await api.post('/jobs', payload)),
  update: async (id, payload) => unwrap(await api.patch(`/jobs/${id}`, payload)),
  submit: async (id) => unwrap(await api.post(`/jobs/${id}/submit`)),
};

export const searchApi = {
  run: async (params = {}) => {
    const response = await api.get('/search', { params });
    return { data: response.data.data, meta: response.data.meta };
  },
};

export const systemApi = {
  page: async (slug) => unwrap(await api.get(`/system/pages/${slug}`)),
  banners: async (position) => unwrap(await api.get('/system/banners', { params: { position } })),
};