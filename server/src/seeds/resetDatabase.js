import mongoose from 'mongoose';
import { configureDnsServers } from '../config/dns.js';
import { connectDatabase, disconnectDatabase } from '../config/database.js';
import { logger } from '../config/logger.js';
import { env } from '../config/env.js';
import { runSeed } from './seedRunner.js';

async function clearDatabase() {
  if (env.NODE_ENV === 'production') {
    throw new Error('Refusing to reset the database in production.');
  }

  const collections = Object.values(mongoose.connection.collections);
  for (const collection of collections) {
    await collection.deleteMany({});
  }
  logger.warn({ collections: collections.length }, 'Development database cleared');
}

async function run() {
  const dnsServers = configureDnsServers();
  logger.info({ dnsServers }, 'DNS configured for reset seed runner');

  await connectDatabase();
  await clearDatabase();
  const result = await runSeed({ includeDemo: true });
  logger.info(
    {
      summary: result.summary,
      demoAccounts: result.demoAccounts,
      demoPassword: result.demoPassword,
    },
    'Database reset and seed completed',
  );
  await disconnectDatabase();
}

run().catch(async (error) => {
  logger.error({ err: error }, 'Database reset failed');
  await disconnectDatabase().catch(() => null);
  process.exit(1);
});
