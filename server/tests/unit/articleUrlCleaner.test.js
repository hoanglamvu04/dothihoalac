import test from 'node:test';
import assert from 'node:assert/strict';

import {
  cleanImportedArticleMarkup,
  cleanImportedArticleBlocks,
} from '../../src/modules/articles/article.urlCleaner.js';

test('URL import removes accessibility toolbar, hidden UI and related stories', () => {
  const source = [
    '<main>',
    '<div class="a11y-toolbar" role="toolbar">',
    '<span>Aa</span><p>Màu chữ</p><p>Tùy chỉnh: #1a1a1a</p>',
    '<p>Tương phản: 17.4:1 — Rất tốt (AAA)</p>',
    '</div>',
    '<article class="article-body">',
    '<h2>Kỳ họp cuối năm 2026</h2>',
    '<p>Sáng 17/11, tổ đại biểu HĐND thành phố Hà Nội tiếp xúc cử tri.</p>',
    '<img data-original="/photo.webp" alt="Hình ảnh kỳ họp">',
    '</article>',
    '<div class="related-stories"><a href="/tin-khac">Tin bên lề</a></div>',
    '<div hidden>Văn bản ẩn</div>',
    '</main>',
  ].join('');

  const cleaned = cleanImportedArticleMarkup(source);

  assert.match(cleaned, /Kỳ họp cuối năm 2026/);
  assert.match(cleaned, /Sáng 17\/11/);
  assert.match(cleaned, /data-original="\/photo\.webp"/);
  assert.doesNotMatch(cleaned, /Màu chữ|17\.4:1|Tin bên lề|Văn bản ẩn/);
});

test('URL import blocks remove the exact noisy labels shown by the source site', () => {
  const title = 'HĐND thành phố dự kiến xem xét 62 nội dung tại kỳ họp';
  const summary = 'Sáng 17/11, tổ đại biểu HĐND thành phố Hà Nội tiếp xúc cử tri.';
  const input = [
    { type: 'p', text: title },
    { type: 'p', text: 'Sapo: ' + summary },
    { type: 'p', text: 'Aa\nMàu chữ:\nTùy chỉnh:\n#1a1a1a\nVề mặc định\nTương phản:\nTùy chỉnh:\n#ffffff\nTương phản: 17.4:1 — Rất tốt (AAA)\nVề mặc định' },
    { type: 'h2', text: 'Nội dung kỳ họp' },
    { type: 'p', text: 'Cử tri tại Hòa Lạc, Yên Xuân, Thạch Thất và Hạ Bằng tham dự buổi tiếp xúc.' },
    { type: 'p', text: 'Cử tri tại Hòa Lạc, Yên Xuân, Thạch Thất và Hạ Bằng tham dự buổi tiếp xúc.' },
    { type: 'p', text: 'Tin liên quan' },
    { type: 'p', text: 'Một tin bên lề không thuộc bài chính.' },
  ];

  const result = cleanImportedArticleBlocks(input, { title, summary });
  assert.deepEqual(result.blocks.map((block) => block.text), [
    'Nội dung kỳ họp',
    'Cử tri tại Hòa Lạc, Yên Xuân, Thạch Thất và Hạ Bằng tham dự buổi tiếp xúc.',
  ]);
  assert.equal(result.removedBlocks, 6);
});

test('URL import preserves factual paragraphs containing generic colour/contrast words', () => {
  const input = [
    { type: 'p', text: 'Màu chữ và độ tương phản là chủ đề trong hướng dẫn thiết kế website.' },
    { type: 'p', text: 'Các chuyên gia trao đổi về độ tương phản ánh sáng tự nhiên trong không gian.' },
  ];
  const result = cleanImportedArticleBlocks(input);
  assert.deepEqual(result.blocks, input);
});

test('URL import removes collapsed UI cluster without losing the article text after it', () => {
  const result = cleanImportedArticleBlocks([
    {
      type: 'p',
      text: 'Aa Màu chữ: Tùy chỉnh: #1a1a1a Về mặc định Tương phản: 17.4:1 — Rất tốt (AAA) Về mặc định Sáng 17/11, cử tri gặp gỡ đại biểu.',
    },
  ]);
  assert.deepEqual(result.blocks.map((block) => block.text), [
    'Sáng 17/11, cử tri gặp gỡ đại biểu.',
  ]);
});

test('URL import keeps image blocks and only trims related-article tail', () => {
  const picture = { type: 'image', url: 'https://example.com/photo.jpg', alt: 'Cuộc họp' };
  const result = cleanImportedArticleBlocks([
    { type: 'p', text: 'Nội dung đầu tiên của tin tức.' },
    picture,
    { type: 'p', text: 'Nội dung thứ hai của tin tức.' },
    { type: 'p', text: 'Bài viết liên quan' },
    { type: 'p', text: 'Tin quảng bá cuối trang.' },
  ]);
  assert.deepEqual(result.blocks, [
    { type: 'p', text: 'Nội dung đầu tiên của tin tức.' },
    picture,
    { type: 'p', text: 'Nội dung thứ hai của tin tức.' },
  ]);
});
