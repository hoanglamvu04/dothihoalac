import { api, unwrap } from './http';

export const jobCompanyApi = {
  detail: async (slug, params = {}, config = {}) =>
    unwrap(
      await api.get(`/jobs/companies/${encodeURIComponent(slug)}`, {
        ...config,
        params,
      }),
    ),
};
