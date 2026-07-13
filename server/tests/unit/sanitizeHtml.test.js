import test from 'node:test';
import assert from 'node:assert/strict';
import { cleanHtml } from '../../src/utils/sanitizeHtml.js';
test('removes script tags', () => {
  const result = cleanHtml('<p>Hello</p><script>alert(1)</script>');
  assert.equal(result.includes('<script>'), false);
  assert.equal(result.includes('<p>Hello</p>'), true);
});
