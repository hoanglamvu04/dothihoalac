#!/usr/bin/env bash
set -Eeuo pipefail
umask 022

# Generate fresh public sitemap files without rebuilding React or touching Git.
CLIENT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
DIST_DIR="$CLIENT_DIR/dist"
SOURCE_API="http://127.0.0.1:5000/api/v1"

if [[ ! -s "$DIST_DIR/index.html" ]]; then
  echo '[DTHL sitemap] A deployed frontend dist/index.html is required' >&2
  exit 2
fi

if ! command -v node >/dev/null 2>&1; then
  echo '[DTHL sitemap] Node.js is required on the VPS' >&2
  exit 3
fi

echo '[DTHL sitemap] Verifying local MongoDB-backed API readiness'
curl --fail --silent --show-error --retry 2 --max-time 10 \
  "$SOURCE_API/health/ready" >/dev/null

# This directory is on the same filesystem as dist, so each mv is atomic.
STAGE_DIR="$(mktemp -d "$DIST_DIR/.sitemap-refresh.XXXXXXXX")"
cleanup() {
  rm -rf "$STAGE_DIR"
}
trap cleanup EXIT

cd "$CLIENT_DIR"
echo '[DTHL sitemap] Fetching current published articles, feeds and taxonomy'
SITEMAP_OUTPUT_DIR="$STAGE_DIR" \
  SITEMAP_SOURCE_API="$SOURCE_API" \
  SITEMAP_SKIP_DYNAMIC_FETCH=false \
  node scripts/generate-sitemap.mjs

echo '[DTHL sitemap] Strictly validating staged XML and dynamic collections'
SITEMAP_OUTPUT_DIR="$STAGE_DIR" \
  SITEMAP_ALLOW_STATIC_ONLY=false \
  SEO_SITEMAP_STRICT=true \
  node scripts/verify-sitemap.mjs

SITEMAP_STATUS_FILE="$STAGE_DIR/sitemap-status.json" node --input-type=module -e '
  import { readFileSync } from "node:fs";
  const s = JSON.parse(readFileSync(process.env.SITEMAP_STATUS_FILE, "utf8"));
  if (s.dynamicFetchSkipped || (s.unavailableCollections || []).length) {
    console.error("[DTHL sitemap] One or more live feed queries failed; keeping the previous sitemap");
    process.exit(4);
  }
  console.log("[DTHL sitemap] Staged URL counts: " + JSON.stringify(s.counts));
'

# Replace the combined sitemap last. On failure, existing public sitemap.xml
# remains intact; a new sitemap is never published from an incomplete fetch.
for file in \
  sitemap-pages.xml sitemap-areas.xml sitemap-news.xml \
  sitemap-community.xml sitemap-properties.xml sitemap-jobs.xml \
  sitemap-status.json sitemap.xml; do
  if [[ ! -s "$STAGE_DIR/$file" ]]; then
    echo "[DTHL sitemap] Missing staged file: $file" >&2
    exit 5
  fi
done

for file in \
  sitemap-pages.xml sitemap-areas.xml sitemap-news.xml \
  sitemap-community.xml sitemap-properties.xml sitemap-jobs.xml \
  sitemap-status.json sitemap.xml; do
  mv -f "$STAGE_DIR/$file" "$DIST_DIR/$file"
done

echo '[DTHL sitemap] Public sitemap successfully refreshed without frontend rebuild'
