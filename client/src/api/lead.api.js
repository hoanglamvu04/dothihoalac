import { api, unwrap } from './http';
import { trackXHubEvent } from '../utils/xhubAnalytics.mjs';
import { withConfirmedLeadTelemetry } from '../utils/xhubLeadSuccess.mjs';

export const leadApi = {
  create: async (payload) => withConfirmedLeadTelemetry(
    async () => unwrap(await api.post('/leads', payload)),
    () => trackXHubEvent('lead_submitted'),
  ),
  referral: async (payload) => unwrap(await api.post('/leads/referrals', payload)),
};
