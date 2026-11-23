import test from 'node:test';
import assert from 'node:assert/strict';
import { assessModerationRisk } from '../../src/modules/moderation/moderationRisk.service.js';

test('near duplicate from the same content type generates an advisory', () => {
  const content = { _id: 'a', contentType: 'property', title: 'Bán đất thổ cư tại Hòa Lạc gần đại học quốc gia', summary: 'Cần kiểm tra giá và giấy tờ trước khi duyệt' };
  const candidates = [{ _id: 'b', contentType: 'property', title: 'Ban dat tho cu tai Hoa Lac gan dai hoc quoc gia' }];
  const risk = assessModerationRisk(content, candidates);
  assert.equal(risk.level, 'high');
  assert.equal(risk.duplicate.contentId, 'b');
  assert.equal(risk.automatedDecision, false);
});

test('no cross-content-type duplicate warning or duplicate self reference', () => {
  const content = { _id: 'a', contentType: 'article', title: 'Thông tin quy hoạch mới tại khu vực Hòa Lạc', summary: 'Thông tin đầy đủ và có dẫn nguồn chính thức.' };
  const candidates = [
    { _id: 'b', contentType: 'property', title: content.title },
    { ...content },
  ];
  assert.equal(assessModerationRisk(content, candidates).duplicate, null);
});

test('short missing details create review flags but do not block submission', () => {
  const risk = assessModerationRisk({ _id: 'a', contentType: 'job', title: 'Việc làm', summary: '' });
  assert.equal(risk.level, 'review');
  assert.ok(risk.flags.length >= 2);
  assert.equal(risk.automatedDecision, false);
});
