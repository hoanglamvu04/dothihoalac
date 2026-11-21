# DTHL MongoDB backup and safe restore verification

The operational backup script is server/scripts/backup-mongodb.sh, called by
.github/workflows/backup-mongodb.yml. It runs at 20:15 UTC daily (03:15 Asia/Bangkok
the following day) and whenever backup scripts/workflows change on main.

## Prerequisites

- MongoDB Database Tools installed on the VPS (mongodump and mongorestore)
- server/.env configured with the real MONGO_URI
- write access and enough disk space under /var/backups/dothihoalac/mongodb
- private backup permissions and secure VPS credentials

## Verify the backup without printing secrets

Run on the VPS:

    cd /var/www/dothihoalac/server
    command -v mongodump && command -v mongorestore
    ls -lt /var/backups/dothihoalac/mongodb/*.archive.gz | head
    cd /var/backups/dothihoalac/mongodb
    for f in *.archive.gz; do
      [ -s "$f" ] || { echo "Empty backup: $f"; continue; }
      gzip -t "$f" && sha256sum -c "$f.sha256"
    done

Do not run mongorestore against the live application database. Test restoring only
into a separate, isolated MongoDB instance with a different URI and suitable
data-access controls. Verify expected collections, document counts and application
queries there before marking recovery proven.

## GitHub Action alert handling

1. Review the Backup DTHL MongoDB workflow in GitHub Actions.
2. Inspect the Create MongoDB backup on VPS SSH step for failures.
3. Fix VPS SSH credentials, MongoDB Database Tools or disk capacity as indicated.
4. Manually dispatch with confirmation BACKUP_DTHL_DB to repeat verification.
5. The automation maintains issue [AUTO] DTHL MongoDB backup failed until success.

## Scope and safety

A valid gzip stream and SHA256 checksum prove archive integrity only; they do not
prove restoration. Local VPS backups do not protect against total VPS loss.
Add encrypted, independently retained offsite copies for disaster recovery.
Never upload database archives or connection secrets to public GitHub artifacts.
