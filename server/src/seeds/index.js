import { configureDnsServers } from '../config/dns.js';
import { connectDatabase, disconnectDatabase } from '../config/database.js';
import { logger } from '../config/logger.js';
import { env } from '../config/env.js';
import { runSeed } from './seedRunner.js';

async function run() {
  const coreOnly = process.argv.includes('--core-only');
  const includeDemo = !coreOnly && env.NODE_ENV !== 'production';

  const dnsServers = configureDnsServers();
  logger.info({ dnsServers }, 'DNS configured for seed runner');

  await connectDatabase();
  const result = await runSeed({ includeDemo });

  logger.info(
    {
      includeDemo,
      summary: result.summary,
      demoAccounts: result.demoAccounts,
      demoPassword: result.demoPassword,
    },
    'Seed completed',
  );
  await disconnectDatabase();
}

run().catch(async (error) => {
  logger.error({ err: error }, 'Seed failed');
  await disconnectDatabase().catch(() => null);
  process.exit(1);
});
