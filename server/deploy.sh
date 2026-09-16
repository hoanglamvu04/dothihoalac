#!/usr/bin/env bash
set -Eeuo pipefail

APP_NAME="${DTHL_PM2_APP:-dothihoalac-api}"
APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(cd "$APP_DIR/.." && pwd)"
HEALTH_URL="${DTHL_HEALTH_URL:-http://127.0.0.1:5000/api/v1/health}"
PREVIOUS_COMMIT="${DTHL_PREVIOUS_COMMIT:-}"
TMP_DIR=""
BACKUP_NODE_MODULES=""

cd "$APP_DIR"

cleanup() {
  if [[ -n "$TMP_DIR" && -d "$TMP_DIR" ]]; then
    rm -rf "$TMP_DIR"
  fi
}
trap cleanup EXIT

log() {
  printf '[DTHL deploy] %s\n' "$*"
}

restore_previous_dependencies() {
  if [[ -n "$BACKUP_NODE_MODULES" && -d "$BACKUP_NODE_MODULES" ]]; then
    log "Restoring previous node_modules"
    rm -rf "$APP_DIR/node_modules"
    mv "$BACKUP_NODE_MODULES" "$APP_DIR/node_modules"
    BACKUP_NODE_MODULES=""
  fi
}

rollback_release() {
  log "Deployment health check failed; rolling back DTHL only"
  restore_previous_dependencies

  if [[ -n "$PREVIOUS_COMMIT" ]]; then
    cd "$REPO_DIR"
    git reset --hard "$PREVIOUS_COMMIT"
    cd "$APP_DIR"
  fi

  if pm2 describe "$APP_NAME" >/dev/null 2>&1; then
    pm2 restart "$APP_NAME" --update-env || true
  fi
}

log "Preparing production dependencies without touching the live node_modules"
TMP_DIR="$(mktemp -d "$APP_DIR/.deploy-deps.XXXXXX")"
cp "$APP_DIR/package.json" "$APP_DIR/package-lock.json" "$TMP_DIR/"

(
  cd "$TMP_DIR"
  npm ci --omit=dev --no-audit --no-fund
  node --input-type=module -e "import('dotenv/config').then(() => console.log('dotenv preflight ok'))"
)

log "Dependency preflight passed"
if [[ -d "$APP_DIR/node_modules" ]]; then
  BACKUP_NODE_MODULES="$APP_DIR/.node_modules.previous.$(date +%s)"
  mv "$APP_DIR/node_modules" "$BACKUP_NODE_MODULES"
fi
mv "$TMP_DIR/node_modules" "$APP_DIR/node_modules"
TMP_DIR=""

# Validate the dependency that previously caused the production crash before
# sending any signal to PM2.
node --input-type=module -e "import('dotenv/config').then(() => console.log('live dependency preflight ok'))"

log "Restarting only $APP_NAME"
if pm2 describe "$APP_NAME" >/dev/null 2>&1; then
  pm2 restart "$APP_NAME" --update-env
else
  pm2 start src/bootstrap.js --name "$APP_NAME" --update-env
fi

log "Waiting for API health: $HEALTH_URL"
HEALTHY=0
for attempt in $(seq 1 30); do
  if curl --fail --silent --show-error --max-time 4 "$HEALTH_URL" >/dev/null; then
    HEALTHY=1
    break
  fi
  sleep 2
done

if [[ "$HEALTHY" != "1" ]]; then
  pm2 logs "$APP_NAME" --lines 80 --nostream || true
  rollback_release
  exit 1
fi

log "API health check passed"
if [[ -n "$BACKUP_NODE_MODULES" && -d "$BACKUP_NODE_MODULES" ]]; then
  rm -rf "$BACKUP_NODE_MODULES"
  BACKUP_NODE_MODULES=""
fi

pm2 save
log "Deployment completed successfully"
