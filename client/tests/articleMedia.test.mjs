import test from 'node:test';
import assert from 'node:assert/strict';
import { bodyContainsVisibleMediaId } from '../src/utils/articleMedia.js';

const mediaId = '507f1f77bcf86cd799439011';
const otherId = '507f1f77bcf86cd799439022';

test('legacy empty cover-only figure does not hide the standalone cover', () => {
  const html = '<figure class="article-cover-only-marker" data-media-id="' + mediaId + '" data-caption-optional="true"></figure><p>Article text</p>';
  assert.equal(bodyContainsVisibleMediaId(html, mediaId), false);
});

test('inline Docs image suppresses duplicate standalone cover', () => {
  const html = '<figure data-media-id="' + mediaId + '"><img src="https://res.cloudinary.com/test/image/upload/photo.webp" alt="Tin" data-media-id="' + mediaId + '"></figure>';
  assert.equal(bodyContainsVisibleMediaId(html, mediaId), true);
});

test('the cover is shown when the body contains a different image', () => {
  const html = '<figure data-media-id="' + otherId + '"><img data-media-id="' + otherId + '"></figure>';
  assert.equal(bodyContainsVisibleMediaId(html, mediaId), false);
});

test('supports single-quoted attributes and refuses invalid IDs', () => {
  assert.equal(bodyContainsVisibleMediaId("<img data-media-id='" + mediaId + "'>", mediaId), true);
  assert.equal(bodyContainsVisibleMediaId("<div data-media-id='" + mediaId + "'></div>", mediaId), false);
  assert.equal(bodyContainsVisibleMediaId("<img data-media-id='" + mediaId + "'>", 'invalid'), false);
});