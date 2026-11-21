/**
 * Telemetry is a non-blocking post-success side-effect.
 * Never send lead payload, caller identity or sourcePage to X-HUB.
 */
export async function createLeadAndReport(leadApi, payload, intelligence) {
  const created = await leadApi.create(payload);
  try {
    intelligence.leadSubmitted();
  } catch {
    // WA-002 must never change the result of a successful CRM submission.
  }
  return created;
}
