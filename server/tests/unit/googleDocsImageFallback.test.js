import test from 'node:test';
import assert from 'node:assert/strict';
import { sourceMediaIdForInitialSync } from '../../src/modules/googleWorkspace/googleDocsImageFallback.js';

const sourceId = '507f1f77bcf86cd799439011';
const secondId = '507f1f77bcf86cd799439022';

test('source URL importer returns stable Media IDs in Google Docs order on initial sync', () => {
  const article = {
    sourceUrl: 'https://example.vn/tin-tuc',
    googleDocSyncedAt: null,
    urlImportImageMediaIds: [sourceId, secondId],
  };
  assert.equal(sourceMediaIdForInitialSync(article, 0), sourceId);
  assert.equal(sourceMediaIdForInitialSync(article, 1), secondId);
  assert.equal(sourceMediaIdForInitialSync(article, 2), '');
});

test('source image fallback cannot silently replace edited Google Docs images later', () => {
  const article = {
    sourceCanonicalUrl: 'https://example.vn/tin-tuc',
    googleDocSyncedAt: new Date(),
    urlImportImageMediaIds: [sourceId],
  };
  assert.equal(sourceMediaIdForInitialSync(article, 0), '');
});

test('only trusted URL imports and valid ordinals/media IDs are eligible', () => {
  assert.equal(sourceMediaIdForInitialSync({
    urlImportImageMediaIds: [sourceId],
  }, 0), '');
  assert.equal(sourceMediaIdForInitialSync({
    sourceUrl: 'https://example.vn',
    urlImportImageMediaIds: ['bogus'],
  }, 0), '');
  assert.equal(sourceMediaIdForInitialSync({
    sourceUrl: 'https://example.vn',
    urlImportImageMediaIds: [sourceId],
  }, -1), '');
});