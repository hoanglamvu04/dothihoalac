import test from 'node:test';
import assert from 'node:assert/strict';
import {
  assessModerationRisk, propertyDuplicateScore,
} from '../../src/modules/moderation/moderationRisk.service.js';
import { propertyRelatedScore } from '../../src/modules/properties/property.related.service.js';

const source = {
  _id: 'content-a', contentType: 'property',
  title: 'Căn hộ 101 khu Hòa Lạc 90m2 cho thuê',
  summary: 'Căn hộ có giấy tờ và hợp đồng rõ ràng.',
  thumbnailMediaId: 'photo-a',
  primaryAreaId: 'area-a',
};
const differentUnit = {
  ...source, _id: 'content-b',
  title: 'Căn hộ 102 khu Hòa Lạc 90m2 cho thuê',
};
const property = {
  propertyType: 'apartment', landArea: 90, price: 2200000000,
  priceUnit: 'total', contactPhone: '0000000000', addressText: 'Căn 101',
};
const otherProperty = { ...property, addressText: 'Căn 102' };

test('the same broker/building but distinct apartment units are NOT duplicates', () => {
  const risk = propertyDuplicateScore(source, differentUnit, property, otherProperty);
  assert.equal(risk.score, 0);
  const propertiesById = new Map([[source._id, property], [differentUnit._id, otherProperty]]);
  const review = assessModerationRisk(source, [differentUnit], { propertiesById });
  assert.equal(review.duplicate, null);
  assert.equal(review.automatedDecision, false);
});

test('high confidence duplicate is explainable without revealing phone data', () => {
  const item = { ...source, title: 'Bán đất ở khu Hòa Lạc mặt đường lớn', _id: 'content-a' };
  const candidate = { ...item, _id: 'content-c' };
  const listing = { ...property, propertyType: 'land', addressText: 'Hòa Lạc' };
  const result = propertyDuplicateScore(item, candidate, listing, listing);
  assert.ok(result.score >= 0.95);
  assert.ok(result.signals.some((value) => value.includes('Cùng ảnh')));
  assert.ok(!JSON.stringify(result).includes('0000000000'));
  const propertiesById = new Map([['content-a', listing], ['content-c', listing]]);
  const review = assessModerationRisk(item, [candidate], { propertiesById });
  assert.equal(review.level, 'high');
  assert.equal(review.duplicate.contentId, 'content-c');
  assert.equal(review.automatedDecision, false);
  assert.ok(Number.isFinite(review.qualityScore));
});

test('related property ranking favors the same area, size and price', () => {
  const now = Date.now();
  const listing = { propertyType: 'land', transactionType: 'sale', landArea: 100, price: 1000000000, priceUnit: 'total' };
  const local = { ...source, title: 'Bán đất khu Hòa Lạc 100 m2', publishedAt: new Date(now) };
  const far = { ...local, primaryAreaId: 'other', title: 'Bán đất xa tỉnh', publishedAt: new Date(now) };
  const scoreA = propertyRelatedScore(local, local, listing, listing, now);
  const scoreB = propertyRelatedScore(local, far, listing, { ...listing, landArea: 900, price: 8000000000 }, now);
  assert.ok(scoreA > scoreB);
});
