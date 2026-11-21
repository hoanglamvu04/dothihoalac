# DTHL MongoDB backup and safe restore verification

The operational backup script is server/scripts/backup-mongodb.sh, called by
.github/workflows/backup-mongodb.yml. It runs at 20:15 UTC daily (03:15 Asia/Bangkok
the following day) and whenever backup scripts/workflows change on main.

## Prerequisites

- MongoDB Database Tools installed on VPS (mongodump and mongorestore). When absent, the workflow fetches the pinned, OS/architecture-specific official .deb package from https://fastdl.mongodb.org, checks the package identity and installs only MongoDB Database Tools using apt. It does not add repositories or upgrade MongoDB Server. Root or passwordless sudo is required.
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


## V4: real restore drill without touching the production database

GitHub Actions now provides the manual workflow **DTHL Isolated MongoDB Restore Drill**.
It does not run on a schedule or after deployment and it does not load the live
MongoDB URI. The VPS is used only to read the latest on-disk backup archive.

Run it from GitHub Actions using confirmation ISOLATED_DTHL_RESTORE. Choose a
MongoDB container image version matching the production server major version
(mongo:6.0, mongo:7.0 or mongo:8.0).

How it works:

1. Check the local archive exists, is nonempty, and passes gzip and SHA256.
2. Require Docker access; use the official MongoDB image selected in the workflow.
3. Start a disposable Docker container with network=none, no published ports,
   limited CPU/RAM and a read-only mount of the backup archive.
4. Run mongorestore with --archive, --gzip and --stopOnError inside that container.
5. Confirm that the restored dothihoalac database has collections and documents.
6. Always remove the test container, including when the script fails.

The source-of-truth script is server/scripts/restore-mongodb-isolated.sh.
Manual CLI usage (from the VPS) is:

    cd /var/www/dothihoalac/server
    DTHL_RESTORE_DRILL_CONFIRM=ISOLATED_DTHL_RESTORE \
      DTHL_RESTORE_DRILL_MONGO_IMAGE=mongo:8.0 \
      bash ./scripts/restore-mongodb-isolated.sh

The command above assumes that production uses MongoDB 8.x. Select the correct
image version in the actual environment. Keep memory/disk pressure in mind and
run the drill during a quiet maintenance window. Without Docker access or a
matching image, the workflow fails clearly; that must NOT be interpreted as
successful recovery verification.

The restore drill proves an archive can be read and restored into an isolated
instance. It does not test application startup against the restored database,
cross-region disaster recovery or independently retained offsite copies.
