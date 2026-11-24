import test from 'node:test';
import assert from 'node:assert/strict';
import { readDiscoveryPreflight } from '../../src/modules/savedSearches/discoveryReadiness.js';

const enabled = process.env.DTHL_MONGO_E2E === 'true';

test('MongoDB E2E: saved searches, index constraints, tenant isolation, alerts', {
  skip: !enabled && 'Run via CI MongoDB service with DTHL_MONGO_E2E=true',
  timeout: 60000,
}, async (t) => {
  // Never let this test connect to production or a shared staging database.
  assert.equal(process.env.NODE_ENV, 'test');
  const uri = process.env.MONGO_URI || '';
  assert.match(uri, /^mongodb:\/\/(?:127\.0\.0\.1|localhost):27017\/dthl_pr78_ci(?:_[a-z0-9_-]+)?$/i);

  const [{ default: mongoose }, { default: request }, { createApp }, tokens, models, { sendSavedSearchAlerts }] =
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
        PropertyListing: (await import('../../src/modules/properties/propertyListing.model.js')).default,
        Notification: (await import('../../src/modules/notifications/notification.model.js')).default,
        NotificationPreference: (await import('../../src/modules/notifications/notificationPreference.model.js')).default,
      })),
      import('../../src/jobs/savedSearchAlerts.job.js'),
    ]);

  await mongoose.connect(uri, { serverSelectionTimeoutMS: 15000 });
  t.after(async () => { await mongoose.disconnect(); });
  const { User, Area, Content, SavedSearch, Notification, NotificationPreference, PropertyListing } = models;
  for (const model of [User, Area, Content, SavedSearch, Notification, NotificationPreference, PropertyListing]) {
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

  await t.test('leased search is skipped across workers, expired lease recovers and pause clears lease', async () => {
    const initialCount = await Notification.countDocuments({ recipientId: userB._id });
    const pending = await Content.create({
      authorId: userA._id, contentType: 'property', title: 'Bất động sản Hòa Lạc tin mới có khóa quét',
      slug: 'e2e-leased-property', primaryAreaId: area._id,
      status: 'published', visibility: 'public', publishedAt: new Date(Date.now() - 1500),
    });
    const cursor = new Date(Date.now() - 3000);
    await SavedSearch.updateOne({ _id: savedB._id }, {
      $set: {
        lastScannedAt: cursor, lastScannedContentId: null,
        scanLeaseToken: 'another-pm2-process',
        scanLeaseUntil: new Date(Date.now() + 60000),
      },
    });
    await sendSavedSearchAlerts();
    assert.equal(await Notification.countDocuments({ recipientId: userB._id }), initialCount);
    assert.equal((await SavedSearch.findById(savedB._id).select('+scanLeaseToken')).scanLeaseToken, 'another-pm2-process');

    // Simulate a crashed worker: only expired leases can be acquired again.
    await SavedSearch.updateOne({ _id: savedB._id }, {
      $set: { scanLeaseUntil: new Date(Date.now() - 1000) },
    });
    await sendSavedSearchAlerts();
    assert.equal(await Notification.countDocuments({
      recipientId: userB._id, targetId: pending._id,
    }), 1);
    const afterScan = await SavedSearch.findById(savedB._id).select('+scanLeaseToken +scanLeaseUntil');
    assert.equal(afterScan.scanLeaseToken, null);
    assert.equal(afterScan.scanLeaseUntil, null);

    // Pause while another worker holds an unexpired lease: invalidate its token.
    await SavedSearch.updateOne({ _id: savedB._id }, { $set: {
      scanLeaseToken: 'running-worker',
      scanLeaseUntil: new Date(Date.now() + 60000),
    } });
    await request(app).patch(endpoint + '/' + savedB._id).set(b).send({ isActive: false }).expect(200);
    const paused = await SavedSearch.findById(savedB._id).select('+scanLeaseToken +scanLeaseUntil');
    assert.equal(paused.isActive, false);
    assert.equal(paused.scanLeaseToken, null);
    assert.equal(paused.scanLeaseUntil, null);
    const before = await Notification.countDocuments({ recipientId: userB._id });
    await Content.create({
      authorId: userA._id, contentType: 'property', title: 'Bất động sản Hòa Lạc khi tạm dừng',
      slug: 'e2e-paused-property', primaryAreaId: area._id,
      status: 'published', visibility: 'public', publishedAt: new Date(Date.now() - 100),
    });
    await sendSavedSearchAlerts();
    assert.equal(await Notification.countDocuments({ recipientId: userB._id }), before);

    await request(app).patch(endpoint + '/' + savedB._id).set(b).send({ isActive: true }).expect(200);
    await sendSavedSearchAlerts();
    // Resume starts at "now", it must not backfill paused content.
    assert.equal(await Notification.countDocuments({ recipientId: userB._id }), before);
  });

  await t.test('backlog of 20 items with identical publishedAt is fully paged without losing the cursor', async () => {
    const timestamp = new Date(Date.now() - 500);
    const batch = await Content.insertMany(Array.from({ length: 20 }, (_, i) => ({
      authorId: userA._id, contentType: 'property',
      title: 'Bất động sản Hòa Lạc lô test ' + i,
      slug: 'e2e-backlog-property-' + i, primaryAreaId: area._id,
      status: 'published', visibility: 'public', publishedAt: timestamp,
    })));
    await SavedSearch.updateOne({ _id: savedB._id }, { $set: {
      lastScannedAt: new Date(timestamp.getTime() - 1000),
      lastScannedContentId: null,
    } });
    for (let i = 0; i < 3; i += 1) await sendSavedSearchAlerts();
    const matching = await Notification.find({
      recipientId: userB._id,
      targetId: { $in: batch.map((item) => item._id) },
    }).lean();
    assert.equal(matching.length, batch.length);
    assert.equal(new Set(matching.map((item) => String(item.targetId))).size, batch.length);
    const finished = await SavedSearch.findById(savedB._id)
      .select('+scanLeaseToken +scanLeaseUntil').lean();
    assert.equal(finished.lastScannedContentId, null);
    assert.equal(finished.scanLeaseToken, null);
    assert.equal(finished.scanLeaseUntil, null);
  });

  await t.test('read-only preflight finds duplicate keys and worker pauses until both MongoDB unique indexes are present', async () => {
    const publishedAt = new Date(Date.now() - 1000);
    const content = await Content.create({
      authorId: userA._id, contentType: 'property',
      title: 'Bất động sản Hòa Lạc tin cần khóa unique index',
      slug: 'e2e-index-gated-property',
      primaryAreaId: area._id, status: 'published', visibility: 'public',
      publishedAt,
    });
    await SavedSearch.updateOne({ _id: savedB._id }, { $set: {
      lastScannedAt: new Date(publishedAt.getTime() - 1000),
      lastScannedContentId: null,
    } });
    const before = await Notification.countDocuments({ recipientId: userB._id });
    const cursorBefore = (await SavedSearch.findById(savedB._id).lean()).lastScannedAt;

    // This CI database is disposable and contains only test fixtures.
    await Notification.collection.dropIndex('unique_notification_dedupe');
    await sendSavedSearchAlerts();
    assert.equal(await Notification.countDocuments({ recipientId: userB._id }), before);
    assert.equal((await SavedSearch.findById(savedB._id).lean()).lastScannedAt.getTime(), cursorBefore.getTime());
    let report = await readDiscoveryPreflight(mongoose.connection.db);
    assert.equal(report.status, 'FAIL');
    assert.equal(report.notificationDedupeUnique, false);

    const key = 'ci-collision:' + new mongoose.Types.ObjectId();
    const fake = {
      recipientId: userA._id,
      notificationType: 'saved_search_match',
      dedupeKey: key,
      title: 'Test duplicate key only',
      deletedAt: null, readAt: null,
      createdAt: new Date(), updatedAt: new Date(),
    };
    const duplicateRows = await Notification.collection.insertMany([{ ...fake }, { ...fake }]);
    report = await readDiscoveryPreflight(mongoose.connection.db);
    assert.equal(report.notificationDuplicates.groups, 1);
    assert.equal(report.notificationDuplicates.extraRecords, 1);
    await Notification.collection.deleteMany({
      _id: { $in: Object.values(duplicateRows.insertedIds) },
    });
    await Notification.collection.createIndex(
      { recipientId: 1, dedupeKey: 1 },
      {
        name: 'unique_notification_dedupe',
        unique: true,
        partialFilterExpression: { dedupeKey: { $type: 'string' } },
      },
    );
    report = await readDiscoveryPreflight(mongoose.connection.db);
    assert.equal(report.status, 'PASS');
    await sendSavedSearchAlerts();
    assert.equal(await Notification.countDocuments({ recipientId: userB._id, targetId: content._id }), 1);
    await sendSavedSearchAlerts();
    assert.equal(await Notification.countDocuments({ recipientId: userB._id, targetId: content._id }), 1);
  });

  await t.test('preflight detects duplicate saved searches without exposing account or query keys', async () => {
    const source = await SavedSearch.findById(savedB._id).lean();
    await SavedSearch.collection.dropIndex('saved_search_per_user_unique');
    const testDuplicate = await SavedSearch.collection.insertOne({
      userId: source.userId, queryNormalized: source.queryNormalized,
      contentType: source.contentType, areaId: source.areaId,
      query: 'CI duplicate record', isActive: false,
    });
    let report = await readDiscoveryPreflight(mongoose.connection.db);
    assert.equal(report.savedSearchUnique, false);
    assert.equal(report.savedSearchDuplicates.groups, 1);
    assert.equal(report.savedSearchDuplicates.extraRecords, 1);
    assert.equal(JSON.stringify(report).includes('CI duplicate record'), false);
    assert.equal(JSON.stringify(report).includes(String(userB._id)), false);
    await SavedSearch.collection.deleteOne({ _id: testDuplicate.insertedId });
    await SavedSearch.collection.createIndex(
      { userId: 1, queryNormalized: 1, contentType: 1, areaId: 1 },
      { name: 'saved_search_per_user_unique', unique: true },
    );
    report = await readDiscoveryPreflight(mongoose.connection.db);
    assert.equal(report.status, 'PASS');
  });

  await t.test('public autocomplete cannot leak private titles and property filters return exact pages', async () => {
    const publishedAt = new Date(Date.now() - 2000);
    const fixtures = await Content.insertMany([
      {
        authorId: userA._id, contentType: 'property',
        title: 'Đất nền Thạch Thất giá hai tỷ',
        summary: 'Đất nền tốt cho thuê hay mua bán',
        slug: 'v2-search-sale-two-billion', primaryAreaId: area._id,
        status: 'published', visibility: 'public', publishedAt,
      },
      {
        authorId: userA._id, contentType: 'property',
        title: 'Đất nền Thạch Thất giá bốn tỷ',
        slug: 'v2-search-sale-four-billion', primaryAreaId: area._id,
        status: 'published', visibility: 'public', publishedAt,
      },
      {
        authorId: userA._id, contentType: 'property',
        title: 'Mật danh riêng Chỉ Quản trị',
        slug: 'v2-search-private-secret', primaryAreaId: area._id,
        status: 'published', visibility: 'private', publishedAt,
      },
    ]);
    const common = {
      transactionType: 'sale', propertyType: 'land', ownerType: 'owner',
      landArea: 120, priceUnit: 'total',
      addressText: 'Test-only address', contactName: 'Test', contactPhone: '0000000000',
      expiresAt: new Date(Date.now() + 86400000),
    };
    await PropertyListing.insertMany([
      { ...common, contentId: fixtures[0]._id, price: 2000000000 },
      { ...common, contentId: fixtures[1]._id, price: 4000000000 },
      { ...common, contentId: fixtures[2]._id, price: 1000000000 },
    ]);
    const fromPublic = await request(app).get('/api/v1/search/suggest')
      .query({ q: 'Đất nền Thạch Thất' }).expect(200);
    assert.ok(fromPublic.body.data.items.some((entry) => entry.label.includes('hai tỷ')));
    assert.ok(fromPublic.body.data.items.every((entry) =>
      entry.href.startsWith('/') && !entry.label.includes('Mật danh riêng')));

    const fromPrivate = await request(app).get('/api/v1/search/suggest')
      .query({ q: 'Mật danh riêng' }).expect(200);
    assert.equal(fromPrivate.body.data.items.length, 0);
    const typo = await request(app).get('/api/v1/search/suggest')
      .query({ q: 'hoa lak' }).expect(200);
    assert.equal(typo.body.data.correction, 'Hòa Lạc');

    // No keyword/area: filter-only searches must work and exclude private and
    // out-of-range listings without loading a capped subset into memory.
    const filtered = await request(app).get('/api/v1/search').query({
      type: 'property', minPrice: '1000000000', maxPrice: '3000000000',
      minArea: '100', maxArea: '200', propertyType: 'land',
      sort: 'price_asc', limit: 10,
    }).expect(200);
    assert.equal(filtered.body.data.contents.length, 1);
    assert.equal(filtered.body.data.contents[0].slug, 'v2-search-sale-two-billion');
    assert.equal(filtered.body.meta.total, 1);
    assert.equal(filtered.body.data.contents[0].bodyText, undefined);
    assert.equal(filtered.body.data.contents[0].listing, undefined);
    assert.equal(filtered.body.data.contents[0].contactPhone, undefined);

    const invalid = await request(app).get('/api/v1/search')
      .query({ type: 'property', minPrice: 400, maxPrice: 200 }).expect(422);
    assert.equal(invalid.body.code, 'SEARCH_FILTER_RANGE');

    const byTime = await request(app).get('/api/v1/search')
      .query({ q: 'Đất nền Thạch Thất', type: 'property', days: 7 }).expect(200);
    assert.ok(byTime.body.data.contents.some((item) => item.slug === 'v2-search-sale-two-billion'));
  });

  await t.test('related properties only return active published public cards without contact PII', async () => {
    const response = await request(app)
      .get('/api/v1/properties/v2-search-sale-two-billion/related').expect(200);
    const cards = response.body.data || [];
    assert.ok(cards.some((entry) => entry.slug === 'v2-search-sale-four-billion'));
    assert.ok(cards.every((entry) =>
      entry.slug !== 'v2-search-private-secret' &&
      !entry.property?.contactPhone && !entry.property?.contactEmail));
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
