import test from 'node:test';
import assert from 'node:assert/strict';

const enabled = process.env.DTHL_MONGO_E2E === 'true';

test('MongoDB E2E: saved searches, index constraints, tenant isolation, alerts', {
  skip: !enabled && 'Run via CI MongoDB service with DTHL_MONGO_E2E=true',
  timeout: 60000,
}, async (t) => {
  // Never let this test connect to production or a shared staging database.
  assert.equal(process.env.NODE_ENV, 'test');
  const uri = process.env.MONGO_URI || '';
  assert.match(uri, /^mongodb:\/\/(?:127\.0\.0\.1|localhost):27017\/dthl_pr78_ci(?:_[a-z0-9_-]+)?$/i);

  const [{ default: mongoose }, { default: request }, { createApp }, tokens, models, svc, { sendSavedSearchAlerts }] =
    await Promise.all([
      import('mongoose'),
      import('supertest'),
      import('../../src/app.js'),
      import('../../src/services/token.service.js'),
      import('../../src/modules/users/user.model.js').then(async ({ default: User }) => ({
        User,
        Area: (await import('../../src/modules/taxonomy/area.model.js')).default,
        Content: (await import('../../src/modules/contents/content.model.js')).default,
        SavedSearch: (await import('../../src/modules/savedSearches/savedSearch.model.js')).default,
        Notification: (await import('../../src/modules/notifications/notification.model.js')).default,
        NotificationPreference: (await import('../../src/modules/notifications/notificationPreference.model.js')).default,
      })),
      import('../../src/services/notification.service.js'),
      import('../../src/jobs/savedSearchAlerts.job.js'),
    ]);

  await mongoose.connect(uri, { serverSelectionTimeoutMS: 15000 });
  t.after(async () => { await mongoose.disconnect(); });
  const { User, Area, Content, SavedSearch, Notification, NotificationPreference } = models;
  for (const model of [User, Area, Content, SavedSearch, Notification, NotificationPreference]) {
    await model.init();
  }

  const savedIndexes = await SavedSearch.collection.indexes();
  assert.ok(savedIndexes.some((item) =>
    item.name === 'saved_search_per_user_unique' &&
    item.unique === true &&
    item.key.userId === 1 &&
    item.key.queryNormalized === 1 &&
    item.key.contentType === 1 &&
    item.key.areaId === 1
  ), 'MongoDB must enforce saved search uniqueness per account and filter');
  const notificationIndexes = await Notification.collection.indexes();
  assert.ok(notificationIndexes.some((item) =>
    item.name === 'unique_notification_dedupe' &&
    item.unique === true &&
    item.key.recipientId === 1 &&
    item.key.dedupeKey === 1 &&
    item.partialFilterExpression?.dedupeKey?.$type === 'string'
  ), 'MongoDB must enforce partial uniqueness for alert dedupe keys');

  const [userA, userB, area, otherArea] = await Promise.all([
    User.create({ email: 'e2e-a@example.invalid', username: 'e2eusera', displayName: 'Test Account A', passwordHash: 'test-only-hash' }),
    User.create({ email: 'e2e-b@example.invalid', username: 'e2euserb', displayName: 'Test Account B', passwordHash: 'test-only-hash' }),
    Area.create({ name: 'Thạch Thất', slug: 'thach-that-e2e', areaType: 'district' }),
    Area.create({ name: 'Quốc Oai', slug: 'quoc-oai-e2e', areaType: 'district' }),
  ]);

  const app = createApp();
  function auth(user) {
    const jwt = tokens.signAccessToken({ sub: String(user._id), sid: String(new mongoose.Types.ObjectId()) });
    return { Authorization: 'Bearer ' + jwt };
  }
  const a = auth(userA);
  const b = auth(userB);
  const endpoint = '/api/v1/saved-searches';

  await t.test('no session cannot read, create, pause or delete saved searches', async () => {
    const id = String(new mongoose.Types.ObjectId());
    for (const req of [
      request(app).get(endpoint), request(app).post(endpoint).send({ query: 'nhà đất' }),
      request(app).patch(endpoint + '/' + id).send({ isActive: false }),
      request(app).delete(endpoint + '/' + id),
    ]) {
      const response = await req.expect(401);
      assert.equal(response.body.code, 'AUTH_REQUIRED');
    }
  });

  let savedA;
  await t.test('account A creates a followed filter and synonyms resolve to the same filter', async () => {
    const body = { query: 'BĐS', contentType: 'property', area: area.slug };
    const first = await request(app).post(endpoint).set(a).send(body).expect(201);
    assert.equal(first.body.data.queryNormalized, 'bat dong san');
    assert.equal(String(first.body.data.areaId), String(area._id));
    const second = await request(app).post(endpoint).set(a).send({
      query: 'Nhà đất', contentType: 'property', area: String(area._id),
    }).expect(201);
    assert.equal(second.body.data._id, first.body.data._id);
    assert.equal(await SavedSearch.countDocuments({ userId: userA._id }), 1);
    savedA = first.body.data;
  });
  let savedB;
  await t.test('account B owns an independent copy of that search', async () => {
    const created = await request(app).post(endpoint).set(b).send({
      query: 'BĐS', contentType: 'property', area: area.slug,
    }).expect(201);
    assert.notEqual(created.body.data._id, savedA._id);
    const listA = await request(app).get(endpoint).set(a).expect(200);
    const listB = await request(app).get(endpoint).set(b).expect(200);
    assert.equal(listA.body.data.length, 1);
    assert.equal(listB.body.data.length, 1);
    assert.notEqual(listA.body.data[0]._id, listB.body.data[0]._id);
    savedB = created.body.data;
  });

  await t.test('a second user cannot update or delete the first user’s search', async () => {
    const otherUpdate = await request(app).patch(endpoint + '/' + savedA._id).set(b).send({ isActive: false }).expect(404);
    assert.equal(otherUpdate.body.code, 'SAVED_SEARCH_NOT_FOUND');
    const otherDelete = await request(app).delete(endpoint + '/' + savedA._id).set(b).expect(404);
    assert.equal(otherDelete.body.code, 'SAVED_SEARCH_NOT_FOUND');
    assert.equal((await SavedSearch.findById(savedA._id)).isActive, true);
  });

  await t.test('user can explicitly pause/re-enable an alert', async () => {
    const paused = await request(app).patch(endpoint + '/' + savedA._id).set(a).send({ isActive: false }).expect(200);
    assert.equal(paused.body.data.isActive, false);
    const resumed = await request(app).patch(endpoint + '/' + savedA._id).set(a).send({ isActive: true }).expect(200);
    assert.equal(resumed.body.data.isActive, true);
  });

  const overlap = await request(app).post(endpoint).set(a).send({
    query: 'BĐS', contentType: 'all', area: area.slug,
  }).expect(201);
  assert.notEqual(overlap.body.data._id, savedA._id);

  // Move only isolated CI cursors back to simulate a publication after follows.
  const now = Date.now();
  await SavedSearch.updateMany({}, { $set: {
    lastScannedAt: new Date(now - 60000), lastScannedContentId: null,
  } });
  const match = await Content.create({
    authorId: userA._id, contentType: 'property', title: 'Bất động sản Hòa Lạc đang bán',
    slug: 'e2e-bat-dong-san-hoa-lac', summary: 'Chính chủ đăng bán nhà đất Hòa Lạc',
    primaryAreaId: area._id, status: 'published', visibility: 'public',
    publishedAt: new Date(now - 10000),
  });

  await Promise.all([
    Content.create({
      authorId: userA._id, contentType: 'property', title: 'Bất động sản chưa duyệt',
      slug: 'e2e-unapproved-property', primaryAreaId: area._id,
      status: 'pending_review', visibility: 'public', publishedAt: new Date(now - 10000),
    }),
    Content.create({
      authorId: userA._id, contentType: 'property', title: 'Bất động sản không công khai',
      slug: 'e2e-private-property', primaryAreaId: area._id,
      status: 'published', visibility: 'private', publishedAt: new Date(now - 10000),
    }),
    Content.create({
      authorId: userA._id, contentType: 'property', title: 'Bất động sản ở Quốc Oai',
      slug: 'e2e-other-location', primaryAreaId: otherArea._id,
      status: 'published', visibility: 'public', publishedAt: new Date(now - 10000),
    }),
    Content.create({
      authorId: userA._id, contentType: 'property', title: 'Bất động sản quá cũ',
      slug: 'e2e-old-property', primaryAreaId: area._id,
      status: 'published', visibility: 'public', publishedAt: new Date(now - 120000),
    }),
  ]);

  await t.test('scanner notifies both accounts, never private/unapproved, and dedupes overlapping filters', async () => {
    await sendSavedSearchAlerts();
    const notificationsA = await Notification.find({ recipientId: userA._id });
    const notificationsB = await Notification.find({ recipientId: userB._id });
    assert.equal(notificationsA.length, 1);
    assert.equal(notificationsB.length, 1);
    assert.equal(String(notificationsA[0].targetId), String(match._id));
    assert.equal(String(notificationsB[0].targetId), String(match._id));
    assert.equal(notificationsA[0].payload.url, '/bat-dong-san/e2e-bat-dong-san-hoa-lac');

    await sendSavedSearchAlerts();
    assert.equal(await Notification.countDocuments({ recipientId: userA._id }), 1);
    assert.equal(await Notification.countDocuments({ recipientId: userB._id }), 1);
    // Reset cursor as would happen on a retry after a worker crash.
    await SavedSearch.updateMany({}, { $set: {
      lastScannedAt: new Date(now - 60000), lastScannedContentId: null,
    } });
    await sendSavedSearchAlerts();
    assert.equal(await Notification.countDocuments({ recipientId: userA._id }), 1);
    assert.equal(await Notification.countDocuments({ recipientId: userB._id }), 1);
  });

  await t.test('notification read/delete endpoints are scoped to the logged-in user', async () => {
    const doc = await Notification.findOne({ recipientId: userA._id });
    const id = String(doc._id);
    const unreadA = await request(app).get('/api/v1/notifications?unread=true').set(a).expect(200);
    const unreadB = await request(app).get('/api/v1/notifications?unread=true').set(b).expect(200);
    assert.equal(unreadA.body.meta.total, 1);
    assert.equal(unreadB.body.meta.total, 1);
    assert.equal(unreadA.body.data[0].url, '/bat-dong-san/e2e-bat-dong-san-hoa-lac');
    await request(app).patch('/api/v1/notifications/' + id + '/read').set(b).expect(404);
    await request(app).delete('/api/v1/notifications/' + id).set(b).expect(404);
    const read = await request(app).patch('/api/v1/notifications/' + id + '/read').set(a).expect(200);
    assert.ok(read.body.data.readAt);
    assert.equal((await request(app).get('/api/v1/notifications/unread-count').set(a).expect(200)).body.data.count, 0);
    assert.equal((await request(app).get('/api/v1/notifications/unread-count').set(b).expect(200)).body.data.count, 1);
  });

  await t.test('notification preferences disable delivery for one user only', async () => {
    await NotificationPreference.create({
      userId: userA._id, notificationType: 'saved_search_match', inAppEnabled: false,
    });
    const next = await Content.create({
      authorId: userA._id, contentType: 'property', title: 'Bất động sản Hòa Lạc tin thứ hai',
      slug: 'e2e-next-property', primaryAreaId: area._id,
      status: 'published', visibility: 'public', publishedAt: new Date(Date.now() - 1000),
    });
    await SavedSearch.updateMany({}, { $set: {
      lastScannedAt: new Date(now - 60000), lastScannedContentId: null,
    } });
    await sendSavedSearchAlerts();
    assert.equal(await Notification.countDocuments({ recipientId: userA._id }), 1);
    assert.equal(await Notification.countDocuments({ recipientId: userB._id }), 2);
    assert.equal(await Notification.countDocuments({ recipientId: userB._id, targetId: next._id }), 1);
  });

  await t.test('same-user duplicate subscriptions are rejected by MongoDB index, not only application code', async () => {
    const existing = await SavedSearch.findById(savedB._id).lean();
    await assert.rejects(
      () => SavedSearch.create({
        userId: existing.userId,
        query: existing.query,
        queryNormalized: existing.queryNormalized,
        contentType: existing.contentType,
        areaId: existing.areaId,
        lastScannedAt: new Date(),
      }),
      (err) => err.code === 11000,
    );
  });
});
