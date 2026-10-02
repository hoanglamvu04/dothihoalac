#!/usr/bin/env bash
set -Eeuo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SITE_URL="${DTHL_SITE_URL:-https://dothihoalac.vn}"
NEXT_DIST="$APP_DIR/.dist.next.$(date +%s)"
PREVIOUS_DIST=""
SWAPPED=0

cd "$APP_DIR"

cleanup() {
  rm -rf "$NEXT_DIST"

  if [[ -n "$PREVIOUS_DIST" && -d "$PREVIOUS_DIST" && "$SWAPPED" == "0" ]]; then
    rm -rf "$PREVIOUS_DIST"
  fi
}

rollback() {
  if [[ "$SWAPPED" == "1" && -n "$PREVIOUS_DIST" && -d "$PREVIOUS_DIST" ]]; then
    printf '[DTHL web deploy] Smoke check failed; restoring previous dist\n'
    rm -rf "$APP_DIR/dist"
    mv "$PREVIOUS_DIST" "$APP_DIR/dist"
    PREVIOUS_DIST=""
    SWAPPED=0
  fi
}

trap 'rollback' ERR
trap cleanup EXIT

printf '[DTHL web deploy] Installing frontend dependencies\n'
npm ci --no-audit --no-fund

printf '[DTHL web deploy] Building next frontend release\n'
npm run build -- --outDir "$NEXT_DIST"

if [[ ! -f "$NEXT_DIST/index.html" ]]; then
  printf '[DTHL web deploy] Build did not produce index.html\n' >&2
  exit 1
fi

if [[ -d "$APP_DIR/dist" ]]; then
  PREVIOUS_DIST="$APP_DIR/.dist.previous.$(date +%s)"
  mv "$APP_DIR/dist" "$PREVIOUS_DIST"
fi

mv "$NEXT_DIST" "$APP_DIR/dist"
SWAPPED=1

printf '[DTHL web deploy] Waiting for site smoke check: %s\n' "$SITE_URL"
HEALTHY=0
for attempt in $(seq 1 20); do
  if curl --location --fail --silent --show-error --max-time 8 "$SITE_URL/" >/dev/null; then
    HEALTHY=1
    break
  fi

  sleep 2
done

if [[ "$HEALTHY" != "1" ]]; then
  printf '[DTHL web deploy] Public site smoke check failed\n' >&2
  false
fi

SWAPPED=0

if [[ -n "$PREVIOUS_DIST" && -d "$PREVIOUS_DIST" ]]; then
  rm -rf "$PREVIOUS_DIST"
  PREVIOUS_DIST=""
fi

printf '[DTHL web deploy] Frontend deployment completed successfully\n'
