import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

const script = 'scripts/vps-health-report.sh';

test('health report bash syntax is valid', () => {
  const r = spawnSync('bash', ['-n', script], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
});
test('health report help documents the VPS path and read-only purpose', () => {
  const r = spawnSync('bash', [script, '--help'], { encoding: 'utf8' });
  assert.equal(r.status, 0);
  assert.match(r.stdout, /\/var\/www\/dothihoalac/);
  assert.match(r.stdout, /Read-only/);
});
test('health report rejects unsupported commands without touching services', () => {
  const r = spawnSync('bash', [script, '--deploy'], { encoding: 'utf8' });
  assert.equal(r.status, 2);
  assert.match(r.stderr, /Unsupported argument/);
});
test('health report refuses running outside configured VPS directory', () => {
  const r = spawnSync('bash', [script], { encoding: 'utf8' });
  assert.equal(r.status, 2);
  assert.match(r.stderr, /REFUSED/);
});
