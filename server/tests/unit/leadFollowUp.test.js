import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeLeadFollowUp, overdueLeadFilter } from '../../src/modules/leads/leadFollowUp.js';

test('lead follow-ups are nullable and normalized into valid dates', () => {
  assert.equal(normalizeLeadFollowUp(null), null);
  assert.equal(normalizeLeadFollowUp(''), null);
  assert.equal(normalizeLeadFollowUp(undefined), undefined);
  assert.equal(
    normalizeLeadFollowUp('2026-11-21T10:00:00.000Z').toISOString(),
    '2026-11-21T10:00:00.000Z',
  );
});

test('lead follow-up rejects invalid dates', () => {
  assert.throws(() => normalizeLeadFollowUp('not-a-date'), /không hợp lệ/);
});

test('overdue lead filter excludes finished leads and requires a date', () => {
  const now = new Date('2026-11-21T10:00:00.000Z');
  const query = overdueLeadFilter(now);
  assert.deepEqual(query.status, { $nin: ['won', 'lost', 'closed'] });
  assert.equal(query.nextFollowUpAt.$lte, now);
  assert.equal(query.nextFollowUpAt.$ne, null);
});
