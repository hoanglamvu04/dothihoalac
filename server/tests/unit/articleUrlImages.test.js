import test from 'node:test';
import assert from 'node:assert/strict';

import {
  bestSrcsetUrl,
  extractArticleImageSource,
} from '../../src/modules/articles/article.urlImages.js';

test('URL importer prefers high-resolution srcset to transparent placeholder', () => {
  const image = extractArticleImageSource(
    '<img src="data:image/gif;base64,R0lG" srcset="/img-480.jpg 480w, /img-1280.jpg 1280w" alt="Cử tri họp">',
  );
  assert.equal(image.rawUrl, '/img-1280.jpg');
  assert.equal(image.alt, 'Cử tri họp');
});

test('URL importer finds source inside picture when img src has no usable image', () => {
  const html = [
    '<picture>',
    '<source type="image/webp" srcset="/photo-640.webp 640w, /photo-1600.webp 1600w">',
    '<img src="data:image/svg+xml;base64,PHN2ZyA+" alt="Đại biểu phát biểu">',
    '</picture>',
  ].join('');

  const image = extractArticleImageSource(
    html.match(/<img\b[^>]*>/)[0],
    html,
  );
  assert.equal(image.rawUrl, '/photo-1600.webp');
});

test('URL importer HTML-decodes signed image URLs from attributes', () => {
  const image = extractArticleImageSource(
    '<img data-original="https://cdn.example.vn/photo.jpg?width=900&amp;key=abc123" alt="Sân trường">',
  );
  assert.equal(image.rawUrl, 'https://cdn.example.vn/photo.jpg?width=900&key=abc123');
});

test('URL importer prioritizes lazy data attributes and supports retina srcset', () => {
  const image = extractArticleImageSource(
    '<img src="placeholder.svg" data-src="https://cdn.example.vn/image.png" data-srcset="/i1.png 1x, /i2.png 2x">',
  );
  assert.equal(image.rawUrl, '/i2.png');
  assert.equal(bestSrcsetUrl('/small.jpg 320w, /large.jpg 1200w'), '/large.jpg');
});

test('URL importer ignores unsafe inline source schemes', () => {
  const image = extractArticleImageSource(
    '<img src="blob:private" data-src="data:image/gif;base64,aGVsbG8=">',
  );
  assert.equal(image.rawUrl, '');
});
