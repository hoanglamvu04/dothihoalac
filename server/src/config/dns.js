import dns from 'node:dns';

const DEFAULT_DNS_SERVERS = '1.1.1.1,8.8.8.8';

export function configureDnsServers() {
  const servers = (process.env.DNS_SERVERS || DEFAULT_DNS_SERVERS)
    .split(',')
    .map((server) => server.trim())
    .filter(Boolean);

  if (servers.length) {
    dns.setServers(servers);
  }

  return dns.getServers();
}
