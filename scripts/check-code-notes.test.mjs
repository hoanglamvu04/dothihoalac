import assert from 'node:assert/strict';
import test from 'node:test';
import {
  assessNotesUpdate,
  isImplementationFile,
  REQUIRED_NOTES,
  readChangedPaths,
} from './check-code-notes.mjs';

test('docs-only changes are exempt from the implementation documentation gate', () => {
  const result = assessNotesUpdate(['AGENTS.md', 'luu-y-code/ROADMAP.md']);
  assert.equal(result.requiresUpdate, false);
  assert.equal(result.ok, true);
  assert.deepEqual(result.missing, []);
});

test('each code, test, deployment and workflow change requires BOTH canonical notes', () => {
  for (const path of [
    'server/src/modules/search/search.service.js',
    'server/tests/integration/search.test.js',
    'client/src/pages/public/SearchPage.jsx',
    'client/.env.example',
    'scripts/deploy.sh',
    '.github/workflows/deploy-api.yml',
    'package.json',
  ]) {
    assert.equal(isImplementationFile(path), true, path);
    const result = assessNotesUpdate([path]);
    assert.equal(result.requiresUpdate, true);
    assert.deepEqual(result.missing, REQUIRED_NOTES);
  }
});

test('a partial update still fails despite an updated roadmap', () => {
  const result = assessNotesUpdate([
    'server/src/app.js', 'luu-y-code/STATUS.md', 'luu-y-code/ROADMAP.md',
  ]);
  assert.equal(result.ok, false);
  assert.deepEqual(result.missing, ['luu-y-code/CHANGELOG.md']);
});

test('updating STATUS and CHANGELOG in the same code diff passes', () => {
  const result = assessNotesUpdate([
    'client/src/app/App.jsx', ...REQUIRED_NOTES,
  ], (file) => REQUIRED_NOTES.includes(file));
  assert.equal(result.requiresUpdate, true);
  assert.equal(result.ok, true);
});

test('deleting a required note is not a valid update', () => {
  const result = assessNotesUpdate([
    'server/src/app.js', ...REQUIRED_NOTES,
  ], (path) => path !== 'luu-y-code/CHANGELOG.md');
  assert.equal(result.ok, false);
  assert.deepEqual(result.missing, ['luu-y-code/CHANGELOG.md']);
});

test('missing GitHub event or base SHA fails closed', () => {
  assert.throws(() => readChangedPaths('', 'push'), /invalid base commit SHA/);
  assert.throws(
    () => readChangedPaths('a'.repeat(40), 'workflow_dispatch'),
    /Unsupported GitHub event/,
  );
});

test('pure docs or agent instructions are exempt from code notes gate', () => {
  for (const path of [
    'AGENTS.md', 'luu-y-code/README.md', 'docs/api/contract.md', 'README.md',
  ]) {
    assert.equal(isImplementationFile(path), false, path);
  }
});
