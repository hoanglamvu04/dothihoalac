import { api, unwrap } from './http';

export const authApi = {
  register: async (payload) => unwrap(await api.post('/auth/register', payload)),
  login: async (payload) => unwrap(await api.post('/auth/login', payload)),
  logout: async () => api.post('/auth/logout'),
  logoutAll: async () => api.post('/auth/logout-all'),
  me: async () => unwrap(await api.get('/auth/me')),
  requestEmailVerification: async () => unwrap(await api.post('/auth/verify-email/request')),
  confirmEmailVerification: async (code) =>
    unwrap(await api.post('/auth/verify-email/confirm', { code })),
  requestPhoneOtp: async (phone) => unwrap(await api.post('/auth/phone/request-otp', { phone })),
  confirmPhoneOtp: async (phone, code) =>
    unwrap(await api.post('/auth/phone/confirm-otp', { phone, code })),
  forgotPassword: async (email) => unwrap(await api.post('/auth/forgot-password', { email })),
  resetPassword: async (payload) => unwrap(await api.post('/auth/reset-password', payload)),
  changePassword: async (payload) => unwrap(await api.patch('/auth/change-password', payload)),
};
