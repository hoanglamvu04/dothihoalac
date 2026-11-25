#!/usr/bin/env bash
# DTHL VPS helper: safe Git fast-forward and read-only diagnostics.
# Does not run npm build, migrate MongoDB, restart PM2, or deploy production.
set -Eeuo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd -P)"
EXPECTED_DIR="/var/www/dothihoalac"
PM2_APP="${DTHL_PM2_APP:-dothihoalac-api}"
API_READY="http://127.0.0.1:5000/api/v1/health/ready"

usage() {
  cat <<'HELP'
DTHL VPS helper (Git pull and inspection only; no deployment)

First time on VPS, after this script lands in GitHub:
  cd /var/www/dothihoalac && git pull --ff-only origin main && bash scripts/vps-update.sh --status

Subsequent safe updates:
  cd /var/www/dothihoalac && bash scripts/vps-update.sh --pull

Diagnostics:
  cd /var/www/dothihoalac && bash scripts/vps-update.sh --status

Read-only MongoDB release checks (needs configured server/.env):
  cd /var/www/dothihoalac && bash scripts/vps-update.sh --preflight

Options: --help, --pull, --status, --preflight
This helper NEVER builds/restarts/deploys. Production release requires
staging acceptance and explicit manual GitHub Actions workflow
"Deploy Do Thi Hoa Lac VPS" (confirmation: DEPLOY_DTHL).
HELP
}

log() {
  printf '[DTHL VPS] %s\n' "$*"
}

require_vps_checkout() {
  if [[ "$REPO_DIR" != "$EXPECTED_DIR" ]]; then
    printf 'REFUSED: expected repository directory %s, got %s\n' \
      "$EXPECTED_DIR" "$REPO_DIR" >&2
    exit 2
  fi
  if [[ "$(git -C "$REPO_DIR" rev-parse --show-toplevel)" != "$REPO_DIR" ]]; then
    printf 'REFUSED: not in the expected Git repository root\n' >&2
    exit 2
  fi
  local origin_url
  origin_url="$(git -C "$REPO_DIR" remote get-url origin)"
  if [[ "$origin_url" != *hoanglamvu04/dothihoalac* ]]; then
    printf 'REFUSED: origin is not hoanglamvu04/dothihoalac\n' >&2
    exit 2
  fi
}

print_status() {
  log "Repo directory: $REPO_DIR"
  log "Git branch: $(git -C "$REPO_DIR" branch --show-current)"
  log "Local code revision: $(git -C "$REPO_DIR" rev-parse --short HEAD)"
  log 'Note: Git HEAD is NOT proof the revision is deployed.'
  if command -v pm2 >/dev/null 2>&1; then
    local app_pid
    app_pid="$(pm2 pid "$PM2_APP" 2>/dev/null || true)"
    if [[ "$app_pid" =~ ^[1-9][0-9]*$ ]]; then
      log "PM2 $PM2_APP: running (PID $app_pid)"
    else
      log "PM2 $PM2_APP: not running or not visible to this user"
    fi
  else
    log 'PM2 command not found (no process changes performed)'
  fi
  if command -v curl >/dev/null 2>&1; then
    if curl --fail --silent --show-error --max-time 6 "$API_READY" >/dev/null 2>&1; then
      log 'Local API + MongoDB readiness: PASS'
    else
      log 'Local API + MongoDB readiness: NOT READY (inspect service separately)'
    fi
  else
    log 'curl not found; API readiness not checked'
  fi
}

safe_pull() {
  require_vps_checkout
  if [[ "$(git -C "$REPO_DIR" branch --show-current)" != 'main' ]]; then
    printf 'REFUSED: switch to main manually; this script never changes branches\n' >&2
    exit 2
  fi
  if [[ -n "$(git -C "$REPO_DIR" status --porcelain --untracked-files=no)" ]]; then
    printf 'REFUSED: tracked local changes found; inspect them before pulling\n' >&2
    exit 2
  fi
  local before after
  before="$(git -C "$REPO_DIR" rev-parse --short HEAD)"
  log "Before pull: $before"
  git -C "$REPO_DIR" fetch origin main
  git -C "$REPO_DIR" merge --ff-only origin/main
  after="$(git -C "$REPO_DIR" rev-parse --short HEAD)"
  log "After pull: $after"
  log 'Source updated; no npm install/build, PM2 restart or database writes were executed.'
}

read_only_preflight() {
  require_vps_checkout
  if ! command -v node >/dev/null 2>&1; then
    printf 'REFUSED: Node.js is required for MongoDB preflight\n' >&2
    exit 2
  fi
  log 'Running read-only discovery/MongoDB preflight. No schema writes.'
  (cd "$REPO_DIR/server" && node scripts/preflight-discovery-release.mjs)
}

case "${1:---help}" in
  --help|-h) usage ;;
  --pull) safe_pull ;;
  --status) require_vps_checkout; print_status ;;
  --preflight) read_only_preflight ;;
  *)
    printf 'Unknown option: %s\n' "$1" >&2
    usage >&2
    exit 2
    ;;
esac
