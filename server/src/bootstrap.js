import "dotenv/config";
import dns from "node:dns";

const dnsServers = (
  process.env.DNS_SERVERS || "1.1.1.1,8.8.8.8"
)
  .split(",")
  .map((server) => server.trim())
  .filter(Boolean);

dns.setServers(dnsServers);

console.log("[DNS] Node đang dùng:", dns.getServers());

try {
  await import("./server.js");
} catch (error) {
  console.error("[BOOTSTRAP ERROR]", error);
  process.exit(1);
}   