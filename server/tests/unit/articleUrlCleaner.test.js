import test from 'node:test';
import assert from 'node:assert/strict';

import {
  cleanImportedArticleMarkup,
  cleanImportedArticleBlocks,
  parseImportedBlockMarkers,
  cleanImportedGoogleDocsRows,
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


test('URL import parses real heading and paragraph boundaries without leaking sentinel tokens', () => {
  const photo = { url: 'https://example.com/anh.webp', alt: 'Ảnh hiện trường' };
  const source = [
    'Đoạn mở đầu của bài.',
    '',
    '[[DTHL_H2]]',
    'Phần nội dung kỳ họp',
    '[[DTHL_END]]',
    '',
    'Đoạn thứ nhất.',
    '',
    'Đoạn thứ hai.',
    '',
    '[[DTHL_IMAGE_0]]',
    '',
    'Đoạn kết.',
  ].join('\n');

  const blocks = parseImportedBlockMarkers(source, [photo]);
  assert.deepEqual(blocks, [
    { type: 'p', text: 'Đoạn mở đầu của bài.' },
    { type: 'h2', text: 'Phần nội dung kỳ họp' },
    { type: 'p', text: 'Đoạn thứ nhất.' },
    { type: 'p', text: 'Đoạn thứ hai.' },
    { type: 'image', ...photo },
    { type: 'p', text: 'Đoạn kết.' },
  ]);
  assert.doesNotMatch(JSON.stringify(blocks), /\[\[DTHL_/);
});


test('legacy Google Docs URL import cleanup removes widget rows and stray parser markers', () => {
  const source = [
    { kind: 'text', text: 'Tin Hòa Lạc có nhiều diễn biến mới', html: 'Tin Hòa Lạc có nhiều diễn biến mới', namedStyle: 'TITLE' },
    { kind: 'text', text: 'Sapo: Bản tin từ địa phương.', html: 'Sapo: Bản tin từ địa phương.', namedStyle: 'SUBTITLE' },
    { kind: 'text', text: 'Aa', html: 'Aa', namedStyle: 'NORMAL_TEXT' },
    { kind: 'text', text: 'Màu chữ', html: 'Màu chữ', namedStyle: 'NORMAL_TEXT' },
    { kind: 'text', text: 'Tương phản: 17.4:1 — Rất tốt (AAA)', html: 'Tương phản: 17.4:1 — Rất tốt (AAA)', namedStyle: 'NORMAL_TEXT' },
    { kind: 'text', text: '[[DTHL_H2]]', html: '[[DTHL_H2]]', namedStyle: 'NORMAL_TEXT' },
    { kind: 'text', text: 'HĐND thành phố họp thường lệ.', html: '<strong>HĐND thành phố họp thường lệ.</strong>', namedStyle: 'NORMAL_TEXT' },
    { kind: 'image', objectId: 'image-one' },
  ];
  const result = cleanImportedGoogleDocsRows(source);
  assert.equal(result.removedRows, 4);
  assert.equal(result.rows.length, 4);
  assert.equal(result.rows[2].html, '<strong>HĐND thành phố họp thường lệ.</strong>');
  assert.deepEqual(result.rows[3], { kind: 'image', objectId: 'image-one' });
});

test('when an imported Docs paragraph contains junk and text, updated HTML cannot reintroduce junk', () => {
  const value = 'Aa Màu chữ: Tùy chỉnh: #1a1a1a Về mặc định Tương phản: 17.4:1 — Rất tốt (AAA) Về mặc định Cử tri Hòa Lạc tham dự cuộc họp.';
  const result = cleanImportedGoogleDocsRows([
    { kind: 'text', text: value, html: '<b>' + value + '</b>', namedStyle: 'NORMAL_TEXT' },
  ]);
  assert.equal(result.rows[0].text, 'Cử tri Hòa Lạc tham dự cuộc họp.');
  assert.equal(result.rows[0].html, 'Cử tri Hòa Lạc tham dự cuộc họp.');
});
