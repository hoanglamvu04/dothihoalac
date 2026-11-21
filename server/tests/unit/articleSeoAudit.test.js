import test from 'node:test';
import assert from 'node:assert/strict';
import { articleSeoIssues } from '../../src/modules/articles/article.seoAudit.js';

const article = {
  title: 'Những đề xuất phát triển hạ tầng giao thông Hòa Lạc trong năm 2026',
  summary: 'Quy hoạch được rà soát dựa trên nhu cầu kết nối, khả năng phát triển hạ tầng và phản hồi của cộng đồng địa phương.',
  thumbnailMediaId: '507f1f77bcf86cd799439011',
  primaryCategoryId: '507f1f77bcf86cd799439022',
  slug: 'de-xuat-phat-trien-ha-tang',
};

test('SEO audit does not flag a complete article', () => {
  assert.deepEqual(articleSeoIssues(article, { bodyText: 'Nội dung đã kiểm chứng và đầy đủ thông tin. '.repeat(15) }), []);
});

test('SEO audit flags absent description, cover, category and short copy', () => {
  const issues = articleSeoIssues({ title: 'Tin mới', slug: 'tin-moi' }, { bodyText: 'Nội dung ngắn' });
  assert.deepEqual(issues.map((issue) => issue.code), [
    'short_title',
    'short_description',
    'missing_cover',
    'missing_category',
    'short_content',
  ]);
});

test('SEO audit flags overly long headings', () => {
  const issues = articleSeoIssues({ ...article, title: 'Tiêu đề rất dài '.repeat(10) }, { bodyText: 'Có rất nhiều nội dung được xuất bản. '.repeat(20) });
  assert.ok(issues.some((issue) => issue.code === 'long_title'));
});
