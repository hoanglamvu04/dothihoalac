import axios from 'axios';

const baseURL = (
  import.meta.env.VITE_API_URL ||
  'http://localhost:5000/api/v1'
).replace(/\/$/, '');

export const api = axios.create({
  baseURL,
  withCredentials: true,
  timeout: 60000,
  headers: {
    Accept: 'application/json',
  },
});

const refreshClient = axios.create({
  baseURL,
  withCredentials: true,
  timeout: 20000,
});

let refreshPromise = null;

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error.response?.status;
    const config = error.config || {};
    const isAuthEndpoint = String(
      config.url || '',
    ).includes('/auth/');

    if (
      status === 401 &&
      !config.__retried &&
      !isAuthEndpoint
    ) {
      config.__retried = true;

      try {
        refreshPromise ||=
          refreshClient
            .post('/auth/refresh')
            .finally(() => {
              refreshPromise = null;
            });

        await refreshPromise;

        return api(config);
      } catch {
        // AuthContext xử lý trạng thái chưa đăng nhập.
      }
    }

    if (
      import.meta.env.VITE_DEBUG_API === 'true'
    ) {
      console.error(
        '[DTHL API]',
        error.response?.data || error.message,
      );
    }

    return Promise.reject(error);
  },
);

export function apiErrorMessage(
  error,
  fallback = 'Có lỗi xảy ra. Vui lòng thử lại.',
) {
  const payload = error?.response?.data;

  if (
    payload?.errors &&
    Array.isArray(payload.errors)
  ) {
    const detail = payload.errors
      .map((item) => item.message)
      .filter(Boolean)
      .join(' ');

    if (detail) {
      return detail;
    }
  }

  return (
    payload?.message ||
    error?.message ||
    fallback
  );
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