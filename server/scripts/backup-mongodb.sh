#!/usr/bin/env bash
set -Eeuo pipefail

SERVER_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKUP_DIR="${DTHL_MONGO_BACKUP_DIR:-/var/backups/dothihoalac/mongodb}"
RETENTION_DAYS="${DTHL_MONGO_BACKUP_RETENTION_DAYS:-14}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
HOST="$(hostname -s 2>/dev/null || hostname)"
ARCHIVE="$BACKUP_DIR/dothihoalac-${HOST}-${STAMP}.archive.gz"
TMP_ARCHIVE="$ARCHIVE.partial"

cd "$SERVER_DIR"
umask 077
mkdir -p "$BACKUP_DIR"

if ! command -v mongodump >/dev/null 2>&1; then
  printf '[DTHL backup] mongodump is required. Install MongoDB Database Tools on the VPS.\n' >&2
  exit 2
fi

MONGO_URI="$(
  node --input-type=module -e "
    import 'dotenv/config';
    const value = String(process.env.MONGO_URI || '').trim();
    if (!value) process.exit(2);
    process.stdout.write(value);
  "
)"

if [[ -z "$MONGO_URI" ]]; then
  printf '[DTHL backup] MONGO_URI is missing from server/.env\n' >&2
  exit 3
fi

cleanup() {
  rm -f "$TMP_ARCHIVE"
}
trap cleanup EXIT

printf '[DTHL backup] Creating encrypted-permission MongoDB archive at %s\n' "$ARCHIVE"
mongodump \
  --uri="$MONGO_URI" \
  --archive="$TMP_ARCHIVE" \
  --gzip

if [[ ! -s "$TMP_ARCHIVE" ]]; then
  printf '[DTHL backup] Backup archive is empty\n' >&2
  exit 4
fi

mv "$TMP_ARCHIVE" "$ARCHIVE"
sha256sum "$ARCHIVE" > "$ARCHIVE.sha256"

find "$BACKUP_DIR" -type f \
  \( -name 'dothihoalac-*.archive.gz' -o -name 'dothihoalac-*.archive.gz.sha256' \) \
  -mtime "+$RETENTION_DAYS" -delete

printf '[DTHL backup] Backup completed: %s\n' "$ARCHIVE"
printf '[DTHL backup] Retention: %s days\n' "$RETENTION_DAYS"
