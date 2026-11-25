#!/usr/bin/env node
/**
 * Gate documentation updates whenever tracked implementation/config/CI changes.
 * The branch owner must still configure a required GitHub status check to block
 * merging on failure; a post-push warning alone cannot undo a push to main.
 */
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const REQUIRED_NOTES = Object.freeze([
  'luu-y-code/STATUS.md',
  'luu-y-code/CHANGELOG.md',
]);

const ROOT_CONFIGS = new Set([
  '.gitignore', 'package.json', 'package-lock.json',
  'pnpm-lock.yaml', 'yarn.lock', 'Dockerfile',
  'docker-compose.yml', 'docker-compose.yaml',
]);

export function isImplementationFile(path) {
  if (typeof path !== 'string') return false;
  const normalized = path.replaceAll('\\', '/');
  if (normalized.startsWith('luu-y-code/') || normalized === 'AGENTS.md') return false;
  return /^(?:server\/|client\/|scripts\/|\.github\/workflows\/)/.test(normalized)
    || ROOT_CONFIGS.has(normalized);
}

export function assessNotesUpdate(changedPaths, exists = () => true) {
  const paths = Array.isArray(changedPaths) ? changedPaths : [];
  const implementation = paths.filter(isImplementationFile);
  const changed = new Set(paths);
  const missing = implementation.length
    ? REQUIRED_NOTES.filter((path) => !changed.has(path) || !exists(path))
    : [];
  return {
    requiresUpdate: implementation.length > 0,
    implementation,
    missing,
    ok: missing.length === 0,
  };
}

export function readChangedPaths(baseSha, eventName) {
  if (!/^[a-f0-9]{40}$/i.test(baseSha || '')) {
    throw new Error('Missing or invalid base commit SHA. Refusing to skip documentation audit.');
  }
  if (!['push', 'pull_request'].includes(eventName)) {
    throw new Error('Unsupported GitHub event for documentation audit.');
  }
  // PR: merge-base vs HEAD. Main push: before..HEAD (including merge commits).
  const range = eventName === 'push' ? baseSha + '..HEAD' : baseSha + '...HEAD';
  const raw = execFileSync('git', [
    'diff', '--name-only', '--diff-filter=ACDMRT', '-z', range,
  ], { encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 });
  return raw.split('\0').filter(Boolean);
}

function runCli() {
  const changedPaths = readChangedPaths(process.argv[2], process.argv[3]);
  const result = assessNotesUpdate(
    changedPaths,
    (path) => existsSync(resolve(process.cwd(), path)),
  );
  if (!result.requiresUpdate) {
    process.stdout.write('Code Notes Gate: PASS (documentation-only change).\n');
    return;
  }
  process.stdout.write(
    'Code Notes Gate: checked ' + result.implementation.length +
    ' implementation/configuration change(s).\n',
  );
  if (!result.ok) {
    process.stderr.write(
      'Code Notes Gate: FAIL. Update BOTH notes within this same change:\n' +
      result.missing.map((path) => ' - ' + path).join('\n') + '\n' +
      'Read AGENTS.md and luu-y-code/HANDOFF.md before retrying.\n',
    );
    process.exitCode = 1;
    return;
  }
  process.stdout.write('Code Notes Gate: PASS (STATUS.md and CHANGELOG.md updated).\n');
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    runCli();
  } catch (error) {
    process.stderr.write('Code Notes Gate: ERROR: ' + error.message + '\n');
    process.exitCode = 1;
  }
}
