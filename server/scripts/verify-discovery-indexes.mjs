#!/usr/bin/env node
// Read-only MongoDB index audit for DTHL P0/P1 acceptance.
// No models, createIndexes, migrations or mutation commands.
import 'dotenv/config';
import mongoose from 'mongoose';
import { verifyDiscoveryIndexes } from '../src/modules/savedSearches/discoveryReadiness.js';
export { verifyDiscoveryIndexes };

async function main() {
  if (!process.env.MONGO_URI) {
    process.stderr.write('DTHL_INDEX_AUDIT_FAILED: MONGO_URI is required (no database accessed).\n');
    process.exitCode = 2;
    return;
  }

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
    process.stdout.write(JSON.stringify({
      status: checks.pass ? 'PASS' : 'FAIL',
      readOnly: true,
      savedSearchCollectionExists: collections.has('savedsearches'),
      notificationCollectionExists: collections.has('notifications'),
      savedSearchUnique: checks.savedSearchUnique,
      notificationDedupeUnique: checks.notificationDedupeUnique,
      savedSearchFairScanIndex: checks.savedSearchFairScanIndex,
    }, null, 2) + '\n');
    if (!checks.pass) process.exitCode = 1;
  } catch (error) {
    // Never print connection string, credentials or document content.
    process.stderr.write('DTHL_INDEX_AUDIT_FAILED: ' + (error?.name || 'ConnectionError') + '\n');
    process.exitCode = 2;
  } finally {
    await connection.close().catch(() => {});
  }
}

if (process.argv[1]?.endsWith('verify-discovery-indexes.mjs')) {
  await main();
}
