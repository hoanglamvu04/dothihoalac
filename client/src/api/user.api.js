import { api, unwrap, unwrapList } from './http';

export const userApi = {
  publicProfile: async (username) => unwrap(await api.get(`/users/${username}`)),
  myProfile: async () => unwrap(await api.get('/users/me/profile')),
  updateProfile: async (payload) => unwrap(await api.patch('/users/me/profile', payload)),
  changeUsername: async (username) =>
    unwrap(await api.patch('/users/me/username', { username })),
  sessions: async () => unwrap(await api.get('/users/me/sessions')),
  revokeSession: async (id) => api.delete(`/users/me/sessions/${id}`),
  myPosts: async (params = {}) => unwrapList(await api.get('/users/me/posts', { params })),
  myListings: async (params = {}) => unwrapList(await api.get('/users/me/listings', { params })),
  myBookmarks: async (params = {}) => unwrapList(await api.get('/users/me/bookmarks', { params })),
  myReports: async (params = {}) => unwrapList(await api.get('/users/me/reports', { params })),
  myActivity: async (params = {}) =>
    unwrapList(await api.get('/users/me/activity', { params })),
  clearSearchActivity: async () =>
    unwrap(await api.delete('/users/me/activity/searches')),
};
