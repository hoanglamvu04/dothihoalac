import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

const script = 'scripts/offsite-mongodb-backup.sh';

function invoke(overrides = {}) {
  return spawnSync('bash', [script, '/archive-not-present.archive.gz'], {
    cwd: process.cwd(),
    encoding: 'utf8',
    timeout: 10000,
    env: {
      ...process.env,
      DTHL_MONGO_OFFSITE_AGE_RECIPIENT: '',
      DTHL_MONGO_OFFSITE_RCLONE_TARGET: '',
      ...overrides,
    },
  });
}

test('offsite backup is disabled by default and never starts a network transfer', () => {
  const result = invoke();
  assert.equal(result.status, 0);
  assert.match(result.stdout, /Not configured/);
});

test('offsite backup fails closed when only the AGE public key is configured', () => {
  const result = invoke({
    DTHL_MONGO_OFFSITE_AGE_RECIPIENT: 'age1example',
  });
  assert.equal(result.status, 21);
  assert.match(result.stderr, /Both AGE recipient and rclone target/);
});

test('offsite backup rejects a local filesystem path as a remote target', () => {
  const result = invoke({
    DTHL_MONGO_OFFSITE_AGE_RECIPIENT: 'age1example',
    DTHL_MONGO_OFFSITE_RCLONE_TARGET: '/tmp/not-an-offsite-target',
  });
  assert.equal(result.status, 22);
  assert.match(result.stderr, /rclone remote:path/);
});
