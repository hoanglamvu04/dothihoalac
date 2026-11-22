# WA-005 — Đô thị Hòa Lạc: X-HUB federated analytics GET

**Status: code ready for review only. NOT deployed / NOT approved for production.**

Contract: [X-HUB WA005_FEDERATED_ANALYTICS_PULL.md](https://github.com/hoanglamvu04/x-hub/blob/main/docs/integrations/WA005_FEDERATED_ANALYTICS_PULL.md).

## WA-002 decision

Use [PR #76](https://github.com/hoanglamvu04/dothihoalac/pull/76) as the single WA-002 foundation. PR #75 is an alternative and must NOT be merged on top. This WA-005 integration branch includes #76's consent UI, GA4-independent tracker, strict same-origin POST and lead-success hooks, plus privacy hardening. No production approval is inferred from green CI.

The approved public host and its owner/workspace mapping must be independently verified. Do not provision a second X-HUB source or copy X-HUB's WA-002 bearer into the new API.

## Data flow (two exclusive WA-002 modes)

- **Disabled by default:** both browser tracker and backend ingestion are OFF, GET returns 503 when unconfigured.
- **Legacy push mode (WA-002):** when explicitly enabled, the existing bridge can forward strict consented events to X-HUB. GET always returns 503 because no local aggregate source is approved. Do NOT add push results to WA-005 aggregate results.
- **Local mode (WA-005):** after site-owner approval, the same strict POST /api/xhub-analytics records only the events page_view, contact_click, lead_submitted in MongoDB. It **never** forwards these to X-HUB. Separate GET /api/xhub/v1/analytics/summary?days=7|30|90 lets X-HUB pull counts. GA4, CRM and legacy event history are never read or backfilled.

The local Mongo collection xhub_consented_metric_events stores **only** a SHA-256 digest of random eventId (deduplication), metric name, date in Asia/Ho_Chi_Minh, consent=true and receive timestamp. It does not store raw event UUID, session ID, IP, path, user, URL, referrer, UTM, form or phone. Unique event hash prevents retries from double counting. TTL on receive timestamp expires rows after 90 days. Verify TTL/unique indexes on staging before approval.

The browser's explicit opt-in (never default true) and DNT/GPC gates run before each tracking request; server additionally rejects DNT: 1 and Sec-GPC: 1. Browser POST includes consent: true only after UI opt-in. **Client-provided consent is an assertion, not cryptographic proof or a retroactive license**; site owner must separately approve notice, origin, storage policy, source and staging end-to-end evidence before enabling.

## Server-only environment

All flags are false by default. No secrets should be entered in Git, issue/PR, VITE variables, or CLI arguments.

~~~dotenv
# Site backend; OFF until approved
XHUB_WEB_ANALYTICS_ENABLED=false
XHUB_WEB_ANALYTICS_MODE=push
XHUB_WEB_ANALYTICS_PUBLIC_HOST=

# These remain for WA-002 push only, and are unused in local mode
XHUB_WEB_ANALYTICS_SITE_ID=
XHUB_WEB_ANALYTICS_SITE_TOKEN=

# WA-005 pull; independent NEW 64-hex read key, private backend only
XHUB_ANALYTICS_PULL_ENABLED=false
XHUB_ANALYTICS_READ_KEY=
~~~

When changing to approved WA-005 local staging mode, operator must explicitly set XHUB_WEB_ANALYTICS_MODE=local, XHUB_WEB_ANALYTICS_ENABLED=true, XHUB_WEB_ANALYTICS_PUBLIC_HOST=dothihoalac.vn, XHUB_ANALYTICS_PULL_ENABLED=true and a generated secret XHUB_ANALYTICS_READ_KEY (**64 hex chars**). The same secret is installed privately as XHUB_PULL_DOTHIHOALAC_KEY on the X-HUB backend through the secret store, never in frontend. Turn on browser flag VITE_XHUB_WEB_ANALYTICS_ENABLED=true only after privacy/consent approvals. Do NOT set push site bearer and local mode simultaneously in live telemetry. No existing site source should be re-created.

## Private API contract

GET https://dothihoalac.vn/api/xhub/v1/analytics/summary?days=7|30|90

- Required: header X-XHub-Analytics-Key, exactly 64 hex characters. Constant-time 32-byte compare. No cookies, OAuth, browser CORS or client key.
- Response 200 only for approved local source and reachable Mongo. JSON v1 contains schemaVersion, siteCode:dothihoalac, siteHost:dothihoalac.vn, period:{days,timezone:Asia/Ho_Chi_Minh}, generatedAt, privacy:{consent:explicit_opt_in,granularity:aggregate_only}, metrics and daily.
- All metrics are safe non-negative integers; daily buckets are sorted dates and sum exactly to metrics. Time window is the most recent 7/30/90 **Vietnam calendar days inclusive**.
- Invalid/missing key: 401 if configured; wrong days: 400; browser Origin/preflight: 403; missing flag/key/source or unavailable database: **503**, never synthetic zero counts; burst: 429.
- GET sets Cache-Control: private, no-store and is mounted **before** global CORS middleware. Public origins cannot read the data via browser fetch.
- Never return raw events, session IDs, paths, visitor/user IDs, IP, PII, UTM, GA4 or CRM data.

## Acceptance & operations gates

1. Review WA-002 #75/#76 overlap; choose one, do not merge both. Verify no regressions in CMS, CRM, login, GA4 or frontend.
2. Confirm ownership/host: this repository must truly serve dothihoalac.vn, and X-HUB's existing source matches the approved organization/workspace; no auto-provision.
3. Approve privacy notice + consent UI, source access, Mongo database and 90-day index policy; validate opt-in/off, GPC/DNT and any reverse proxy forwarding.
4. Configure HTTPS **same-origin reverse proxy** for both POST and GET from public hostname to this Express backend (web and API may live on separate origins today). No browser redirects, no CORS exceptions.
5. Generate a unique 32-byte hex read key by an approved operator; place it only in each backend secret store; protect with restricted file permissions and rotate as needed. Do not reuse the WA-002 token.
6. Run tests on Node 22; inspect PR CI + staging 200/400/401/403/429/503, daily totals and 90-day TTL; verify pull dashboard isolates the correct site and does NOT add push counts. Do NOT deploy production until separately approved.

## Tests

~~~bash
node --test client/tests/xhubWa002.test.mjs
npm test --prefix server
SITEMAP_ALLOW_STATIC_ONLY=true SITEMAP_SKIP_DYNAMIC_FETCH=true npm run build --prefix client
~~~

CI has the same frontend/build/backend coverage. No actual X-HUB production traffic, migration, key generation, VPS changes or Nginx changes are performed by this PR.
