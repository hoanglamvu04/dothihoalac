import 'dotenv/config';

import { configureDnsServers } from './config/dns.js';

const dnsServers = configureDnsServers();

console.log('[DNS] Node đang dùng:', dnsServers);

try {
  await import('./server.js');
} catch (error) {
  console.error('[BOOTSTRAP ERROR]', error);
  process.exit(1);
}
