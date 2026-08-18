import { api, unwrap, unwrapList } from './http';

const GOOGLE_DOCS_TIMEOUT_MS = 25000;
const GOOGLE_DOCS_SYNC_TIMEOUT_MS = 120000;

export const adminApi = {
  dashboard: async () => unwrap(await api.get('/admin/dashboard')),
  moderationQueue: async (params = {}) =>
    unwrapList(await api.get('/admin/moderation/queue', { params })),
  moderate: async (id, action, payload = {}) =>
    unwrap(await api.post(`/admin/contents/${id}/${action}`, payload)),

  managedContents: async (type, params = {}) =>
    unwrapList(await api.get(`/admin/contents/${type}`, { params })),
  managedContentDetail: async (type, id) =>
    unwrap(await api.get(`/admin/contents/${type}/${id}`)),
  updateManagedContent: async (type, id, payload) =>
    unwrap(await api.patch(`/admin/contents/${type}/${id}`, payload)),
  updateManagedContentStatus: async (type, id, status, note = '') =>
    unwrap(await api.patch(`/admin/contents/${type}/${id}/status`, { status, note })),
  deleteManagedContent: async (type, id) =>
    unwrap(await api.delete(`/admin/contents/${type}/${id}`)),

  comments: async (params = {}) =>
    unwrapList(await api.get('/admin/comments', { params })),
  updateComment: async (id, payload) =>
    unwrap(await api.patch(`/admin/comments/${id}`, payload)),
  deleteComment: async (id) =>
    unwrap(await api.delete(`/admin/comments/${id}`)),

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

  projects: async (params = {}) =>
    unwrapList(await api.get('/admin/projects', { params })),
  projectDetail: async (id) => unwrap(await api.get(`/admin/projects/${id}`)),
  createProject: async (payload) => unwrap(await api.post('/admin/projects', payload)),
  updateProject: async (id, payload) => unwrap(await api.patch(`/admin/projects/${id}`, payload)),
  deleteProject: async (id) => unwrap(await api.delete(`/admin/projects/${id}`)),
  addProjectUpdate: async (id, payload) =>
    unwrap(await api.post(`/admin/projects/${id}/updates`, payload)),
  deleteProjectUpdate: async (id, updateId) =>
    unwrap(await api.delete(`/admin/projects/${id}/updates/${updateId}`)),

  sourceWatchOverview: async () => unwrap(await api.get('/admin/source-watch/overview')),
  sourceWatchSources: async () => unwrap(await api.get('/admin/source-watch/sources')),
  createSourceWatchSource: async (payload) =>
    unwrap(await api.post('/admin/source-watch/sources', payload)),
  updateSourceWatchSource: async (id, payload) =>
    unwrap(await api.patch(`/admin/source-watch/sources/${id}`, payload)),
  checkSourceWatchSource: async (id) =>
    unwrap(await api.post(`/admin/source-watch/sources/${id}/check`)),
  sourceWatchItems: async (params = {}) =>
    unwrapList(await api.get('/admin/source-watch/items', { params })),
  updateSourceWatchItemStatus: async (id, status) =>
    unwrap(await api.patch(`/admin/source-watch/items/${id}/status`, { status })),

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

  banners: async (params = {}) =>
    unwrap(await api.get('/admin/system/banners', { params })),
  createBanner: async (payload) =>
    unwrap(await api.post('/admin/system/banners', payload)),
  updateBanner: async (id, payload) =>
    unwrap(await api.patch(`/admin/system/banners/${id}`, payload)),
  toggleBanner: async (id, isActive) =>
    unwrap(await api.patch(`/admin/system/banners/${id}/toggle`, { isActive })),
  deleteBanner: async (id) =>
    unwrap(await api.delete(`/admin/system/banners/${id}`)),

  activityLogs: async (params = {}) =>
    unwrapList(await api.get('/admin/system/activity-logs', { params })),
};
