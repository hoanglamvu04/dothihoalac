#!/usr/bin/env node
// Strict, read-only release gate: check physical MongoDB indexes AND existing
// duplicate keys. Report counts only, never duplicate identifiers or PII.
import 'dotenv/config';
import mongoose from 'mongoose';
import { readDiscoveryPreflight } from '../src/modules/savedSearches/discoveryReadiness.js';

if (!process.env.MONGO_URI) {
  process.stderr.write('DTHL_PREFLIGHT_FAILED: MONGO_URI is required (no database accessed).\n');
  process.exitCode = 2;
} else {
  const connection = mongoose.createConnection(process.env.MONGO_URI, {
    autoIndex: false,
    autoCreate: false,
    serverSelectionTimeoutMS: 10000,
    connectTimeoutMS: 10000,
  });
  try {
    await connection.asPromise();
    const checks = await readDiscoveryPreflight(connection.db);
    process.stdout.write(JSON.stringify(checks, null, 2) + '\n');
    if (checks.status !== 'PASS') process.exitCode = 1;
  } catch (error) {
    process.stderr.write('DTHL_PREFLIGHT_FAILED: ' + (error?.name || 'DatabaseError') + '\n');
    process.exitCode = 2;
  } finally {
    await connection.close().catch(() => {});
  }
}
