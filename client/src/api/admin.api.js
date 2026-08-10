import { api, unwrap, unwrapList } from './http';

const GOOGLE_DOCS_TIMEOUT_MS = 25000;
const GOOGLE_DOCS_SYNC_TIMEOUT_MS = 120000;

export const adminApi = {
  dashboard: async () => unwrap(await api.get('/admin/dashboard')),
  moderationQueue: async (params = {}) =>
    unwrapList(await api.get('/admin/moderation/queue', { params })),
  moderate: async (id, action, payload = {}) =>
    unwrap(await api.post(`/admin/contents/${id}/${action}`, payload)),
  users: async (params = {}) => unwrapList(await api.get('/admin/users', { params })),
  updateUserStatus: async (id, payload) =>
    unwrap(await api.patch(`/admin/users/${id}/status`, payload)),
  reports: async (params = {}) => unwrapList(await api.get('/admin/reports', { params })),
  resolveReport: async (id, payload) =>
    unwrap(await api.patch(`/admin/reports/${id}`, payload)),
  leads: async (params = {}) => unwrapList(await api.get('/admin/leads', { params })),
  leadDetail: async (id) => unwrap(await api.get(`/admin/leads/${id}`)),
  updateLead: async (id, payload) => unwrap(await api.patch(`/admin/leads/${id}`, payload)),

  articles: async (params = {}) => unwrapList(await api.get('/admin/articles', { params })),
  articleDetail: async (id) => unwrap(await api.get(`/admin/articles/${id}`)),
  createArticle: async (payload) => unwrap(await api.post('/admin/articles', payload)),
  updateArticle: async (id, payload) => unwrap(await api.patch(`/admin/articles/${id}`, payload)),
  updateArticleMetadata: async (id, payload) =>
    unwrap(await api.patch(`/admin/articles/${id}/metadata`, payload)),
  deleteArticle: async (id) => unwrap(await api.delete(`/admin/articles/${id}`)),
  bulkDeleteArticles: async (ids) =>
    unwrap(await api.post('/admin/articles/bulk-delete', { ids })),

  googleWorkspaceStatus: async () => unwrap(await api.get('/admin/google-workspace/status')),
  googleWorkspaceReuseKthl: async () => unwrap(await api.post('/admin/google-workspace/reuse-kthl')),
  googleWorkspaceConnectUrl: async () => unwrap(await api.get('/admin/google-workspace/connect-url')),
  googleWorkspaceSetup: async (payload = {}) => unwrap(await api.post('/admin/google-workspace/setup', payload)),
  googleWorkspaceDisconnect: async () => unwrap(await api.post('/admin/google-workspace/disconnect')),
  createGoogleDraft: async (payload = {}) => unwrap(await api.post(
    '/admin/google-workspace/posts/create-draft',
    payload,
    { timeout: GOOGLE_DOCS_TIMEOUT_MS },
  )),
  ensureGoogleDoc: async (id) => unwrap(await api.post(
    `/admin/google-workspace/posts/${id}/ensure-doc`,
    undefined,
    { timeout: GOOGLE_DOCS_TIMEOUT_MS },
  )),
  syncGoogleDoc: async (id) => unwrap(await api.post(
    `/admin/google-workspace/posts/${id}/sync`,
    undefined,
    { timeout: GOOGLE_DOCS_SYNC_TIMEOUT_MS },
  )),
  publishGoogleDoc: async (id) => unwrap(await api.post(
    `/admin/google-workspace/posts/${id}/publish`,
    undefined,
    { timeout: GOOGLE_DOCS_SYNC_TIMEOUT_MS },
  )),

  createTaxonomy: async (type, payload) =>
    unwrap(await api.post(`/admin/taxonomy/${type}`, payload)),
  updateTaxonomy: async (type, id, payload) =>
    unwrap(await api.patch(`/admin/taxonomy/${type}/${id}`, payload)),
  removeTaxonomy: async (type, id) =>
    unwrap(await api.delete(`/admin/taxonomy/${type}/${id}`)),

  settings: async () => unwrap(await api.get('/admin/system/settings')),
  updateSetting: async (key, payload) =>
    unwrap(await api.patch(`/admin/system/settings/${key}`, payload)),
  pages: async () => unwrap(await api.get('/admin/system/pages')),
  createPage: async (payload) => unwrap(await api.post('/admin/system/pages', payload)),
  updatePage: async (id, payload) =>
    unwrap(await api.patch(`/admin/system/pages/${id}`, payload)),
  banners: async () => unwrap(await api.get('/admin/system/banners')),
  createBanner: async (payload) => unwrap(await api.post('/admin/system/banners', payload)),
  updateBanner: async (id, payload) =>
    unwrap(await api.patch(`/admin/system/banners/${id}`, payload)),
  activityLogs: async (params = {}) =>
    unwrapList(await api.get('/admin/system/activity-logs', { params })),
};
