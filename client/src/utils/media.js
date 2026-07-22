const serverUrl = (
  import.meta.env.VITE_SERVER_URL ||
  'http://localhost:5000'
).replace(/\/$/, '');

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

  return `${serverUrl}${url.startsWith('/') ? '' : '/'}${url}`;
}