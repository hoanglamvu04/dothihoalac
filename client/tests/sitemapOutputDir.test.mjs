import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const clientDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('sitemap generation and strict validator can share an isolated staging directory', (t) => {
  const outputDir = mkdtempSync(path.join(tmpdir(), 'dthl-sitemap-test-'));
  t.after(() => rmSync(outputDir, { recursive: true, force: true }));

  const env = {
    ...process.env,
    SITEMAP_OUTPUT_DIR: outputDir,
    SITEMAP_SKIP_DYNAMIC_FETCH: 'true',
    SITEMAP_ALLOW_STATIC_ONLY: 'true',
    SEO_SITEMAP_STRICT: 'false',
    VITE_SITE_URL: 'https://dothihoalac.vn',
  };

  const generate = spawnSync(process.execPath, ['scripts/generate-sitemap.mjs'], {
    cwd: clientDir,
    env,
    timeout: 20000,
    encoding: 'utf8',
  });

  assert.equal(generate.status, 0, generate.stderr || generate.stdout);

  const verify = spawnSync(process.execPath, ['scripts/verify-sitemap.mjs'], {
    cwd: clientDir,
    env,
    timeout: 20000,
    encoding: 'utf8',
  });

  assert.equal(verify.status, 0, verify.stderr || verify.stdout);

  const xml = readFileSync(path.join(outputDir, 'sitemap.xml'), 'utf8');
  const metadata = JSON.parse(readFileSync(path.join(outputDir, 'sitemap-status.json'), 'utf8'));

  assert.ok(xml.includes('<urlset'));
  assert.ok(xml.includes('<loc>https://dothihoalac.vn/</loc>'));
  assert.ok(metadata.dynamicFetchSkipped);
  assert.equal(metadata.counts.news, 0);
  assert.ok(metadata.counts.areas >= 6);
});
