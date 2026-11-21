import test from 'node:test';
import assert from 'node:assert/strict';
import { createLeadAndReport } from '../src/utils/leadTelemetry.js';

const secretPayload = {
  fullName: 'Personal Name Not For Telemetry',
  phone: '0900000000',
  email: 'private@example.com',
  message: 'Personal details and budget',
  sourcePage: '/tu-van?q=private',
};

test('lead_submitted occurs only AFTER the real CRM API confirms success', async () => {
  let resolveRequest;
  const calls = [];
  const leadApi = {
    create: (payload) => {
      assert.deepEqual(payload, secretPayload);
      calls.push('api-started');
      return new Promise((resolve) => { resolveRequest = resolve; });
    },
  };
  const telemetry = {
    leadSubmitted: (...args) => {
      assert.deepEqual(args, [], 'never transmit lead fields to telemetry');
      calls.push('telemetry');
    },
  };

  const pending = createLeadAndReport(leadApi, secretPayload, telemetry);
  assert.deepEqual(calls, ['api-started']);
  resolveRequest({ _id: 'created-lead-id' });
  assert.deepEqual(await pending, { _id: 'created-lead-id' });
  assert.deepEqual(calls, ['api-started', 'telemetry']);
});

test('failed lead API cannot emit a lead_submitted event', async () => {
  let counted = 0;
  const leadApi = {
    create: async () => { throw new Error('HTTP 422'); },
  };
  const telemetry = { leadSubmitted: () => { counted += 1; } };

  await assert.rejects(
    createLeadAndReport(leadApi, secretPayload, telemetry),
    /HTTP 422/,
  );
  assert.equal(counted, 0);
});

test('telemetry outage cannot cause a confirmed CRM success to fail', async () => {
  const confirmed = { _id: 'created-lead-id' };
  const result = await createLeadAndReport(
    { create: async () => confirmed },
    secretPayload,
    { leadSubmitted: () => { throw new Error('Optional analytics offline'); } },
  );
  assert.deepEqual(result, confirmed);
});
