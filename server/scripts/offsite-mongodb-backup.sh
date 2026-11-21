#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

# Offsite transfer is strictly opt-in, and only AGE-ENCRYPTED bytes are sent.
SERVER_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$SERVER_DIR"

read_offsite_setting() {
  node --input-type=module -e "
    import 'dotenv/config';
    process.stdout.write(String(process.env[process.argv[1]] || '').trim());
  " "$1"
}

AGE_RECIPIENT="$(read_offsite_setting DTHL_MONGO_OFFSITE_AGE_RECIPIENT)"
RCLONE_TARGET="$(read_offsite_setting DTHL_MONGO_OFFSITE_RCLONE_TARGET)"

if [[ -z "$AGE_RECIPIENT" && -z "$RCLONE_TARGET" ]]; then
  echo '[DTHL offsite] Not configured; encrypted offsite upload skipped'
  exit 0
fi

if [[ -z "$AGE_RECIPIENT" || -z "$RCLONE_TARGET" ]]; then
  echo '[DTHL offsite] Both AGE recipient and rclone target must be configured' >&2
  exit 21
fi

if [[ "$RCLONE_TARGET" != *:* || "$RCLONE_TARGET" == *".."* ]]; then
  echo '[DTHL offsite] Target must be a safe configured rclone remote:path' >&2
  exit 22
fi

for tool in age rclone sha256sum; do
  if ! command -v "$tool" >/dev/null 2>&1; then
    echo "[DTHL offsite] Required command is missing: $tool" >&2
    exit 23
  fi
done

if [[ "$#" -lt 1 ]]; then
  echo '[DTHL offsite] Local archive path argument required' >&2
  exit 24
fi

ARCHIVE="$1"
if [[ ! -f "$ARCHIVE" || ! -s "$ARCHIVE" ]]; then
  echo '[DTHL offsite] Valid local backup archive required' >&2
  exit 24
fi

TEMP_DIR="$(mktemp -d /tmp/dthl-offsite.XXXXXXXX)"
cleanup() {
  rm -rf "$TEMP_DIR"
}
trap cleanup EXIT

ARCHIVE_NAME="$(basename "$ARCHIVE").age"
ENCRYPTED="$TEMP_DIR/$ARCHIVE_NAME"
MANIFEST="$TEMP_DIR/$ARCHIVE_NAME.sha256"
REMOTE_FOLDER="$(printf '%s' "$RCLONE_TARGET" | sed 's:/$::')"
REMOTE_ARCHIVE="$REMOTE_FOLDER/$ARCHIVE_NAME"

echo '[DTHL offsite] Encrypting archive locally using AGE public key'
age -r "$AGE_RECIPIENT" -o "$ENCRYPTED" "$ARCHIVE"

if [[ ! -s "$ENCRYPTED" ]]; then
  echo '[DTHL offsite] Encrypted archive is empty' >&2
  exit 26
fi

LOCAL_SHA="$(sha256sum "$ENCRYPTED" | cut -d ' ' -f1)"
printf '%s  %s\n' "$LOCAL_SHA" "$ARCHIVE_NAME" > "$MANIFEST"

echo '[DTHL offsite] Uploading encrypted archive to preconfigured remote'
rclone copyto "$ENCRYPTED" "$REMOTE_ARCHIVE" \
  --retries 3 --low-level-retries 5 --stats 0

# Download through rclone again and check its digest. Never print backup bytes.
REMOTE_SHA="$(rclone cat "$REMOTE_ARCHIVE" | sha256sum | cut -d ' ' -f1)"
if [[ "$REMOTE_SHA" != "$LOCAL_SHA" ]]; then
  echo '[DTHL offsite] Remote encrypted archive failed SHA256 verification' >&2
  exit 27
fi

rclone copyto "$MANIFEST" "$REMOTE_ARCHIVE.sha256" \
  --retries 3 --low-level-retries 5 --stats 0

echo '[DTHL offsite] Encrypted upload verified by full readback and SHA256'
echo '[DTHL offsite] Offsite retention is managed by the remote storage lifecycle policy'
