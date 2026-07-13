import { api, unwrap } from './http';

export const leadApi = {
  create: async (payload) => unwrap(await api.post('/leads', payload)),
  referral: async (payload) => unwrap(await api.post('/leads/referrals', payload)),
};
