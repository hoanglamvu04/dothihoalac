#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

# Manual-only disaster recovery rehearsal. NEVER connect to the live database.
# The restored MongoDB lives in a temporary network-isolated Docker container.
if [[ "$(printenv DTHL_RESTORE_DRILL_CONFIRM || true)" != "ISOLATED_DTHL_RESTORE" ]]; then
  echo '[DTHL restore drill] Set DTHL_RESTORE_DRILL_CONFIRM=ISOLATED_DTHL_RESTORE to continue' >&2
  exit 2
fi

if ! command -v docker >/dev/null 2>&1 || ! docker info >/dev/null 2>&1; then
  echo '[DTHL restore drill] Docker is required and the user must have Docker access' >&2
  exit 3
fi

BACKUP_DIR="$(printenv DTHL_MONGO_BACKUP_DIR || true)"
if [[ -z "$BACKUP_DIR" ]]; then
  BACKUP_DIR="/var/backups/dothihoalac/mongodb"
fi

IMAGE="$(printenv DTHL_RESTORE_DRILL_MONGO_IMAGE || true)"
if [[ -z "$IMAGE" ]]; then
  IMAGE="mongo:8.0"
fi

case "$IMAGE" in
  mongo:6.0|mongo:7.0|mongo:8.0) ;;
  *)
    echo '[DTHL restore drill] Image must be a supported official mongo:6.0/7.0/8.0 tag' >&2
    exit 4
    ;;
esac

if [[ ! -d "$BACKUP_DIR" ]]; then
  echo '[DTHL restore drill] No backup directory found' >&2
  exit 5
fi

LATEST=""
shopt -s nullglob
for candidate in "$BACKUP_DIR"/dothihoalac-*.archive.gz; do
  if [[ -z "$LATEST" || "$candidate" -nt "$LATEST" ]]; then
    LATEST="$candidate"
  fi
done

if [[ -z "$LATEST" || ! -s "$LATEST" || ! -s "$LATEST.sha256" ]]; then
  echo '[DTHL restore drill] No nonempty archive with SHA256 manifest found' >&2
  exit 6
fi

if ! gzip -t "$LATEST"; then
  echo '[DTHL restore drill] Backup archive failed gzip verification' >&2
  exit 7
fi

if ! sha256sum -c "$LATEST.sha256" >/dev/null; then
  echo '[DTHL restore drill] Backup archive failed SHA256 verification' >&2
  exit 8
fi

CONTAINER="dthl-restore-drill-$(date +%s)-$$"
cleanup() {
  docker rm -f "$CONTAINER" >/dev/null 2>&1 || true
}
trap cleanup EXIT

echo '[DTHL restore drill] Starting a disposable MongoDB; no host port or network'
docker run \
  --detach --rm \
  --network none \
  --memory 2g \
  --cpus 1 \
  --pids-limit 256 \
  --name "$CONTAINER" \
  --volume "$LATEST:/backup.archive.gz:ro" \
  "$IMAGE" \
  mongod --bind_ip 127.0.0.1 --quiet >/dev/null

READY=0
for attempt in $(seq 1 45); do
  if docker exec "$CONTAINER" mongosh --quiet \
    --eval 'db.adminCommand({ping:1}).ok' 2>/dev/null | grep -q '^1$'; then
    READY=1
    break
  fi
  sleep 2
done

if [[ "$READY" != "1" ]]; then
  echo '[DTHL restore drill] Isolated MongoDB did not start; no production changes were made' >&2
  exit 9
fi

# Archive was created from the dothihoalac database; limit namespaces to it.
# No production URI, credentials, host port or container network is supplied.
docker exec "$CONTAINER" mongorestore \
  --quiet --stopOnError \
  --archive=/backup.archive.gz --gzip \
  '--nsInclude=dothihoalac.*'

docker exec "$CONTAINER" mongosh --quiet --eval '
  const database = db.getSiblingDB("dothihoalac");
  const names = database.getCollectionNames().filter((name) => !name.startsWith("system."));
  if (names.length < 1) { print("RESTORE_EMPTY_COLLECTIONS"); quit(11); }
  const documents = names.reduce(
    (total, name) => total + database.getCollection(name).estimatedDocumentCount(), 0
  );
  if (documents < 1) { print("RESTORE_EMPTY_DOCUMENTS"); quit(12); }
  print("RESTORE_OK collections=" + names.length + " documents=" + documents);
'

echo '[DTHL restore drill] Verified a real restore in a disposable isolated container'
echo '[DTHL restore drill] Cleanup removes the container and restored test data'
