#!/usr/bin/env node
// Read-only MongoDB index audit for DTHL P0/P1 acceptance.
// No model imports, createIndexes, migrations or mutation commands.
import 'dotenv/config';
import mongoose from 'mongoose';

export function verifyDiscoveryIndexes(savedIndexes, notificationIndexes) {
  const savedSearchUnique = savedIndexes.some((index) =>
    index.name === 'saved_search_per_user_unique' &&
    index.unique === true &&
    index.key?.userId === 1 &&
    index.key?.queryNormalized === 1 &&
    index.key?.contentType === 1 &&
    index.key?.areaId === 1
  );

  const notificationDedupeUnique = notificationIndexes.some((index) =>
    index.name === 'unique_notification_dedupe' &&
    index.unique === true &&
    index.key?.recipientId === 1 &&
    index.key?.dedupeKey === 1 &&
    index.partialFilterExpression?.dedupeKey?.$type === 'string'
  );

  return {
    savedSearchUnique,
    notificationDedupeUnique,
    pass: savedSearchUnique && notificationDedupeUnique,
  };
}

async function main() {
  if (!process.env.MONGO_URI) {
    process.stderr.write('DTHL_INDEX_AUDIT_FAILED: MONGO_URI is required (no database accessed).\n');
    process.exitCode = 2;
    return;
  }

  // Separate connection with no registered models, no indexing or collection creation.
  const connection = mongoose.createConnection(process.env.MONGO_URI, {
    autoIndex: false,
    autoCreate: false,
    serverSelectionTimeoutMS: 10000,
    connectTimeoutMS: 10000,
  });
  try {
    await connection.asPromise();
    const collections = new Set(
      (await connection.db.listCollections({}, { nameOnly: true }).toArray())
        .map((entry) => entry.name),
    );
    const saved = collections.has('savedsearches')
      ? await connection.db.collection('savedsearches').listIndexes().toArray()
      : [];
    const notifications = collections.has('notifications')
      ? await connection.db.collection('notifications').listIndexes().toArray()
      : [];
    const checks = verifyDiscoveryIndexes(saved, notifications);
    const result = {
      status: checks.pass ? 'PASS' : 'FAIL',
      readOnly: true,
      savedSearchCollectionExists: collections.has('savedsearches'),
      notificationCollectionExists: collections.has('notifications'),
      savedSearchUnique: checks.savedSearchUnique,
      notificationDedupeUnique: checks.notificationDedupeUnique,
    };
    process.stdout.write(JSON.stringify(result, null, 2) + '\n');
    if (!checks.pass) process.exitCode = 1;
  } catch (error) {
    // Never print connection string, credentials or document content.
    process.stderr.write('DTHL_INDEX_AUDIT_FAILED: ' + (error?.name || 'ConnectionError') + '\n');
    process.exitCode = 2;
  } finally {
    await connection.close().catch(() => {});
  }
}

// Not run when imported by node:test.
if (process.argv[1]?.endsWith('verify-discovery-indexes.mjs')) {
  await main();
}
