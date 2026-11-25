import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

const script = 'scripts/vps-update.sh';

test('VPS command helper is shell-syntax valid', () => {
  const result = spawnSync('bash', ['-n', script], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
});

test('VPS --help contains the correct /var/www repository path and manual deployment gate', () => {
  const result = spawnSync('bash', [script, '--help'], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /cd \/var\/www\/dothihoalac/);
  assert.match(result.stdout, /git pull --ff-only origin main/);
  assert.match(result.stdout, /DEPLOY_DTHL/);
  assert.match(result.stdout, /NEVER builds\/restarts\/deploys/);
});

test('unknown switches fail safely without invoking Git, NPM or PM2', () => {
  const result = spawnSync('bash', [script, '--deploy'], { encoding: 'utf8' });
  assert.equal(result.status, 2);
  assert.match(result.stderr, /Unknown option: --deploy/);
});
