import axios from 'axios';

import { resetBackendDiscovery, resolveApiBaseUrl } from './runtime.js';

function createHttpClient(timeout) {
  const client = axios.create({
    withCredentials: true,
    timeout,
    headers: {
      Accept: 'application/json',
    },
  });

  client.interceptors.request.use(async (config) => {
    config.baseURL = await resolveApiBaseUrl();
    return config;
  });

  return client;
}

export const api = createHttpClient(60000);
const refreshClient = createHttpClient(20000);

let refreshPromise = null;

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config || {};

    if (
      import.meta.env.DEV &&
      !error.response &&
      !axios.isCancel(error) &&
      !config.__backendRediscovered
    ) {
      config.__backendRediscovered = true;
      resetBackendDiscovery();

      try {
        config.baseURL = await resolveApiBaseUrl();
        return api(config);
      } catch {
        // Không tìm được backend mới; trả lỗi gốc bên dưới.
      }
    }

    const status = error.response?.status;
    const isAuthEndpoint = String(config.url || '').includes('/auth/');

    if (status === 401 && !config.__retried && !isAuthEndpoint) {
      config.__retried = true;

      try {
        refreshPromise ||=
          refreshClient.post('/auth/refresh').finally(() => {
            refreshPromise = null;
          });

        await refreshPromise;
        config.baseURL = await resolveApiBaseUrl();
        return api(config);
      } catch {
        // AuthContext xử lý trạng thái chưa đăng nhập.
      }
    }

    if (import.meta.env.VITE_DEBUG_API === 'true') {
      console.error('[DTHL API]', error.response?.data || error.message);
    }

    return Promise.reject(error);
  },
);

export function apiErrorMessage(
  error,
  fallback = 'Có lỗi xảy ra. Vui lòng thử lại.',
) {
  const payload = error?.response?.data;

  if (payload?.errors && Array.isArray(payload.errors)) {
    const detail = payload.errors
      .map((item) => item.message)
      .filter(Boolean)
      .join(' ');

    if (detail) {
      return detail;
    }
  }

  return payload?.message || error?.message || fallback;
}

export function unwrap(response) {
  return response?.data?.data;
}

export function unwrapList(response) {
  return {
    items: response?.data?.data || [],
    meta: response?.data?.meta || {
      page: 1,
      limit: 12,
      total: 0,
      totalPages: 1,
    },
  };
}
