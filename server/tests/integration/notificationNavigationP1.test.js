import test from 'node:test';
import assert from 'node:assert/strict';
import { notificationDestination, safeNotificationPath } from '../../src/modules/notifications/notification.service.js';
import { NOTIFICATION_TYPES } from '../../src/constants/notificationTypes.js';

test('saved-search notification routes to public content, never to an external address', () => {
  const valid = { notificationType: NOTIFICATION_TYPES.SAVED_SEARCH_MATCH, payload: { url: '/tin-tuc/tin-moi' } };
  assert.equal(notificationDestination(valid), '/tin-tuc/tin-moi');
  for (const url of ['https://external.example', '//external.example', '/\\external.example', '/bad\npath', 'javascript:alert(1)']) {
    assert.equal(safeNotificationPath(url), '');
    assert.equal(notificationDestination({ ...valid, payload: { url } }), '/tai-khoan/thong-bao');
  }
});

test('existing notification destinations stay available', () => {
  assert.equal(notificationDestination({ notificationType: NOTIFICATION_TYPES.JOB_EXPIRING }), '/tai-khoan/noi-dung?type=job');
  assert.equal(notificationDestination({ payload: { contentType: 'article', slug: 'ha-bang/2026' } }), '/tin-tuc/ha-bang%2F2026');
});
