import { api, unwrap, unwrapList } from './http';

const PUBLIC_LIST_CACHE_TTL = 15000;
const publicListCache = new Map();
const publicListInFlight = new Map();

function normalizeCacheValue(value) {
  if (Array.isArray(value)) {
    return value.map(normalizeCacheValue);
  }

  if (value && typeof value === 'object') {
    return Object.keys(value)
      .sort()
      .reduce((result, key) => {
        const nextValue = value[key];
        if (nextValue !== undefined) {
          result[key] = normalizeCacheValue(nextValue);
        }
        return result;
      }, {});
  }

  return value;
}

function cacheKey(url, params = {}) {
  return `${url}?${JSON.stringify(normalizeCacheValue(params))}`;
}

function clearPublicListCache() {
  publicListCache.clear();
  publicListInFlight.clear();
}

function emitContentChanged(item, action = 'update') {
  clearPublicListCache();

  if (typeof window === 'undefined') return;

  window.dispatchEvent(
    new CustomEvent('dthl:content-changed', {
      detail: {
        action,
        item: item || null,
        id: String(item?._id || item?.id || ''),
      },
    }),
  );
}

async function mutation(request, action) {
  const item = unwrap(await request);
  emitContentChanged(item, action);
  return item;
}

function getList(url, params = {}, config = {}) {
  const { cache = true, ...axiosConfig } = config || {};
  const key = cache ? cacheKey(url, params) : '';

  if (cache) {
    const cached = publicListCache.get(key);
    const now = Date.now();

    if (cached && now - cached.createdAt < PUBLIC_LIST_CACHE_TTL) {
      return Promise.resolve(cached.response);
    }

    if (cached) {
      publicListCache.delete(key);
    }
  }

  if (!cache) {
    return api.get(url, {
      ...axiosConfig,
      params,
    });
  }

  // Chỉ chia sẻ request đang chạy khi request không gắn AbortSignal. Nếu dùng
  // chung một request có signal, một component unmount có thể hủy request của
  // component khác. Request có signal vẫn được ghi cache sau khi hoàn tất để
  // điều hướng quay lại trang không phải tải lại ngay.
  if (!axiosConfig.signal) {
    const pending = publicListInFlight.get(key);
    if (pending) {
      return pending;
    }
  }

  const request = api
    .get(url, {
      ...axiosConfig,
      params,
    })
    .then((response) => {
      publicListCache.set(key, {
        createdAt: Date.now(),
        response,
      });
      return response;
    });

  if (axiosConfig.signal) {
    return request;
  }

  const sharedRequest = request.finally(() => {
    publicListInFlight.delete(key);
  });

  publicListInFlight.set(key, sharedRequest);
  return sharedRequest;
}

function optimizedCommunityParams(params = {}) {
  if (params.compact !== undefined) return params;

  const limit = Number(params.limit || 0);
  const isSmallPopularWidget =
    params.sort === 'popular' &&
    limit > 0 &&
    limit <= 5 &&
    !params.q &&
    !params.area &&
    !params.category &&
    !params.type;

  return isSmallPopularWidget
    ? { ...params, compact: 1 }
    : params;
}

export const draftApi = {
  create: async (contentType) =>
    mutation(api.post('/drafts', { contentType }), 'create-draft'),
  detail: async (id) => unwrap(await api.get(`/drafts/${id}`)),
  remove: async (id) => mutation(api.delete(`/drafts/${id}`), 'delete-draft'),
};

export const articleApi = {
  list: async (params = {}, config = {}) => unwrapList(await getList('/articles', params, config)),
  detail: async (slug, config = {}) => unwrap(await api.get(`/articles/${slug}`, config)),
  submitTip: async (payload) => unwrap(await api.post('/articles/tips', payload)),
};

export const projectApi = {
  list: async (params = {}, config = {}) => unwrapList(await getList('/projects', params, config)),
  detail: async (slug, config = {}) => unwrap(await api.get(`/projects/${slug}`, config)),
};

export const communityApi = {
  list: async (params = {}, config = {}) =>
    unwrapList(await getList('/community', optimizedCommunityParams(params), config)),
  detail: async (slug, config = {}) => unwrap(await api.get(`/community/${slug}`, config)),
  editDetail: async (id, config = {}) => unwrap(await api.get(`/community/${id}/edit`, config)),
  create: async (payload) => mutation(api.post('/community', payload), 'create'),
  update: async (id, payload) => mutation(api.patch(`/community/${id}`, payload), 'update'),
  remove: async (id) => {
    const response = await api.delete(`/community/${id}`);
    emitContentChanged({ _id: id }, 'delete');
    return response;
  },
  submit: async (id) => mutation(api.post(`/community/${id}/submit`), 'submit'),
  acceptAnswer: async (id, commentId) =>
    unwrap(await api.post(`/community/${id}/accept-answer`, { commentId })),
};

export const propertyApi = {
  list: async (params = {}, config = {}) => unwrapList(await getList('/properties', params, config)),
  detail: async (slug, config = {}) => unwrap(await api.get(`/properties/${slug}`, config)),
  editDetail: async (id, config = {}) => unwrap(await api.get(`/properties/${id}/edit`, config)),
  create: async (payload) => mutation(api.post('/properties', payload), 'create'),
  update: async (id, payload) => mutation(api.patch(`/properties/${id}`, payload), 'update'),
  submit: async (id) => mutation(api.post(`/properties/${id}/submit`), 'submit'),
  renew: async (id) => mutation(api.post(`/properties/${id}/renew`), 'renew'),
  markSold: async (id) => mutation(api.post(`/properties/${id}/mark-sold`), 'mark-sold'),
  markRented: async (id) => mutation(api.post(`/properties/${id}/mark-rented`), 'mark-rented'),
  contact: async (id, contactType) =>
    unwrap(await api.post(`/properties/${id}/contact-events`, { contactType })),
};

export const jobApi = {
  list: async (params = {}, config = {}) => unwrapList(await getList('/jobs', params, config)),
  detail: async (slug, config = {}) => unwrap(await api.get(`/jobs/${slug}`, config)),
  editDetail: async (id, config = {}) => unwrap(await api.get(`/jobs/${id}/edit`, config)),
  create: async (payload) => mutation(api.post('/jobs', payload), 'create'),
  update: async (id, payload) => mutation(api.patch(`/jobs/${id}`, payload), 'update'),
  submit: async (id) => mutation(api.post(`/jobs/${id}/submit`), 'submit'),
};

export const searchApi = {
  run: async (params = {}, config = {}) => {
    const response = await getList('/search', params, config);
    return { data: response.data.data, meta: response.data.meta };
  },
};

export const systemApi = {
  page: async (slug, config = {}) => unwrap(await api.get(`/system/pages/${slug}`, config)),
  banners: async (position, config = {}) =>
    unwrap(await api.get('/system/banners', { ...config, params: { position } })),
};
