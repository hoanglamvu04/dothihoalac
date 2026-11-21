import test from 'node:test';
import assert from 'node:assert/strict';
import { articleQualityChecks } from '../../src/modules/articles/article.quality.js';

const valid = {
  content: {
    title: 'Hội nghị phát triển đô thị Hòa Lạc năm 2026 và nhiệm vụ trọng tâm',
    summary: 'Các đại biểu trao đổi về quy hoạch, hạ tầng, cơ hội đầu tư và những giải pháp phát triển đô thị tại Hòa Lạc.',
    status: 'draft',
    visibility: 'public',
    primaryCategoryId: '507f1f77bcf86cd799439011',
  },
  body: {
    bodyText: 'Nội dung bài báo chi tiết được biên tập và kiểm chứng từ nguồn chính thức. '.repeat(8),
    bodyHtml: '<p>Nội dung bài báo chi tiết được biên tập và kiểm chứng từ nguồn chính thức.</p>',
    inlineMediaIds: [],
  },
  hasCover: true,
};

test('article quality reports a publish-ready article without blockers', () => {
  const result = articleQualityChecks(valid);
  assert.equal(result.ready, true);
  assert.equal(result.blockers, 0);
  assert.equal(result.warnings, 0);
});

test('article quality blocks leftover URL import tokens and temporary images', () => {
  const result = articleQualityChecks({
    ...valid,
    body: {
      ...valid.body,
      bodyHtml: '<p>[[DTHL_H2]]</p><img src="blob:opaque">',
    },
  });
  assert.equal(result.ready, false);
  assert.deepEqual(
    result.checks.filter((x) => x.level === 'block').map((x) => x.code),
    ['import_artifacts', 'temporary_images'],
  );
});

test('article quality warns on missing cover and sapo without deleting content', () => {
  const result = articleQualityChecks({
    content: { ...valid.content, summary: '', primaryCategoryId: null },
    body: valid.body,
    hasCover: false,
  });
  assert.equal(result.ready, true);
  assert.equal(result.warnings, 3);
});

test('article quality blocks invalid schedule dates', () => {
  const result = articleQualityChecks({
    content: { ...valid.content, status: 'scheduled', scheduledAt: 'not a date' },
    body: valid.body,
    hasCover: true,
  });
  assert.equal(result.ready, false);
  assert.ok(result.checks.some((x) => x.code === 'schedule' && x.level === 'block'));
});

test('article quality blocks missing inline images even when a valid cover exists', () => {
  const result = articleQualityChecks({
    ...valid,
    body: {
      ...valid.body,
      inlineMediaIds: ['present', 'missing'],
    },
    validInlineCount: 1,
    invalidInlineCount: 1,
  });
  assert.equal(result.ready, false);
  assert.equal(result.blockers, 1);
  assert.ok(result.checks.some((check) => check.code === 'invalid_inline_images'));
});

test('article quality warns when a selected cover is no longer active', () => {
  const result = articleQualityChecks({
    ...valid,
    content: { ...valid.content, thumbnailMediaId: 'stale-cover' },
    body: { ...valid.body, inlineMediaIds: ['good-inline'] },
    hasCover: false,
    validInlineCount: 1,
  });
  assert.equal(result.ready, true);
  assert.ok(result.checks.some((check) => check.code === 'inactive_cover'));
  assert.ok(result.checks.some((check) => check.code === 'images' && check.level === 'warn'));
});
