import { api, unwrap, unwrapList } from './http';

export const commentApi = {
  list: async (contentId, params = {}) =>
    unwrapList(await api.get(`/contents/${contentId}/comments`, { params })),
  create: async (contentId, payload) =>
    unwrap(await api.post(`/contents/${contentId}/comments`, payload)),
  update: async (id, body) => unwrap(await api.patch(`/comments/${id}`, { body })),
  remove: async (id) => api.delete(`/comments/${id}`),
};

export const reactionApi = {
  put: async (targetType, targetId, reactionType) =>
    unwrap(await api.put(`/reactions/${targetType}/${targetId}`, { reactionType })),
  remove: async (targetType, targetId) =>
    unwrap(await api.delete(`/reactions/${targetType}/${targetId}`)),
};

export const bookmarkApi = {
  put: async (contentId) => unwrap(await api.put(`/bookmarks/${contentId}`)),
  remove: async (contentId) => unwrap(await api.delete(`/bookmarks/${contentId}`)),
};

export const followApi = {
  list: async () => unwrap(await api.get('/follows')),
  put: async (targetType, targetId) => unwrap(await api.put(`/follows/${targetType}/${targetId}`)),
  remove: async (targetType, targetId) =>
    unwrap(await api.delete(`/follows/${targetType}/${targetId}`)),
};

export const notificationApi = {
  list: async (params = {}) => unwrapList(await api.get('/notifications', { params })),
  unreadCount: async () => unwrap(await api.get('/notifications/unread-count')),
  read: async (id) => unwrap(await api.patch(`/notifications/${id}/read`)),
  readAll: async () => unwrap(await api.patch('/notifications/read-all')),
  remove: async (id) => unwrap(await api.delete(`/notifications/${id}`)),
  preferences: async () => unwrap(await api.get('/notification-preferences')),
  updatePreferences: async (items) =>
    unwrap(await api.patch('/notification-preferences', items)),
};

export const reportApi = {
  create: async (payload) => unwrap(await api.post('/reports', payload)),
};
