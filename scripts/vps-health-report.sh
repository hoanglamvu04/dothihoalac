#!/usr/bin/env bash
# Read-only operational smoke report. Does not print response bodies or secrets.
set -Eeuo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd -P)"
EXPECTED="/var/www/dothihoalac"
APP="${DTHL_PM2_APP:-dothihoalac-api}"
FAILED=0

if [[ "${1:-}" == "--help" ]]; then
  echo "Usage: cd /var/www/dothihoalac && bash scripts/vps-health-report.sh"
  echo "Read-only local PM2/API, public homepage and sitemap smoke checks."
  exit 0
fi
if [[ "$#" -gt 0 ]]; then
  echo "Unsupported argument (read-only mode only)" >&2
  exit 2
fi
if [[ "$ROOT" != "$EXPECTED" ]] || [[ "$(git -C "$ROOT" rev-parse --show-toplevel 2>/dev/null || true)" != "$EXPECTED" ]]; then
  echo "REFUSED: script must run from $EXPECTED repository" >&2
  exit 2
fi
if ! git -C "$ROOT" remote get-url origin 2>/dev/null | grep -Fq 'hoanglamvu04/dothihoalac'; then
  echo "REFUSED: unexpected Git origin" >&2
  exit 2
fi
printf 'DTHL read-only report UTC: %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
printf 'Source SHA: %s (not proof of deployed revision)\n' "$(git -C "$ROOT" rev-parse --short HEAD)"

check_http() {
  local label="$1" url="$2" expected="$3" status
  if ! command -v curl >/dev/null 2>&1; then
    printf 'FAIL %s: curl unavailable\n' "$label"
    FAILED=1
    return
  fi
  status="$(curl --silent --output /dev/null --location --max-redirs 3 --connect-timeout 4 --max-time 12 --write-out '%{http_code}' "$url" 2>/dev/null || true)"
  if [[ "$status" == "$expected" ]]; then
    printf 'PASS %s: HTTP %s\n' "$label" "$status"
  else
    printf 'FAIL %s: HTTP %s (expected %s)\n' "$label" "${status:-000}" "$expected"
    FAILED=1
  fi
}

if command -v pm2 >/dev/null 2>&1; then
  pid="$(pm2 pid "$APP" 2>/dev/null || true)"
  if [[ "$pid" =~ ^[1-9][0-9]*$ ]]; then
    printf 'PASS PM2 %s: running\n' "$APP"
  else
    printf 'FAIL PM2 %s: not running or not visible\n' "$APP"
    FAILED=1
  fi
else
  printf 'FAIL PM2: command unavailable\n'
  FAILED=1
fi
check_http "local-api-ready" "http://127.0.0.1:5000/api/v1/health/ready" "200"
check_http "public-home" "https://dothihoalac.vn/" "200"
check_http "public-sitemap" "https://dothihoalac.vn/sitemap.xml" "200"
if [[ "$FAILED" -ne 0 ]]; then
  echo 'RESULT FAIL - investigate before release. No changes performed.'
  exit 1
fi
echo 'RESULT PASS - HTTP/process smoke only; does not prove staging, database indexes, SEO validity or deployed SHA.'
