// The CRM payload never enters the analytics adapter. A lead event is emitted
// only after the site's own HTTP lead endpoint has resolved successfully.
export async function withConfirmedLeadTelemetry(createLead, onConfirmed) {
  const result = await createLead();
  try {
    onConfirmed?.();
  } catch {
    // A telemetry failure must never turn a successful CRM submission into
    // an apparent error or cause the form to resubmit customer PII.
  }
  return result;
}
