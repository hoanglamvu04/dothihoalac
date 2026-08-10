export function sourceWatchRuntimeConfig() {
  const enabled = String(process.env.SOURCE_WATCH_ENABLED || 'true')
    .trim()
    .toLowerCase() !== 'false';

  const intervalSeconds = Number(process.env.SOURCE_WATCH_WORKER_INTERVAL_SECONDS || 60);

  return {
    enabled,
    workerIntervalSeconds: Number.isFinite(intervalSeconds)
      ? Math.max(30, Math.min(300, Math.round(intervalSeconds)))
      : 60,
    facebookConfigured: Boolean(
      String(process.env.FACEBOOK_GRAPH_ACCESS_TOKEN || '').trim(),
    ),
  };
}
