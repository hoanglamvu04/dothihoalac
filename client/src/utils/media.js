import { getResolvedServerBaseUrl } from '../api/runtime.js';

export function mediaUrl(value) {
  const url =
    typeof value === 'string'
      ? value
      : value?.secureUrl ||
        value?.url ||
        value?.publicUrl ||
        value?.storagePath ||
        '';

  if (!url) {
    return '';
  }

  if (
    /^https?:\/\//i.test(url) ||
    url.startsWith('data:') ||
    url.startsWith('blob:')
  ) {
    return url;
  }

  const serverUrl = getResolvedServerBaseUrl();
  return `${serverUrl}${url.startsWith('/') ? '' : '/'}${url}`;
}
