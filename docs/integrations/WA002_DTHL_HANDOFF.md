# WA-002 — Đô Thị Hòa Lạc: X-HUB Web Intelligence integration

Status: **CODE PREPARED, DISABLED / NOT APPROVED FOR PRODUCTION**.

Sources (X-HUB main):
- docs/integrations/WEB_ANALYTICS_WA001.md
- docs/integrations/WA001_SITE_HANDOFF.md
- integrations/web-analytics/xhub-web-tracker.mjs
- integrations/web-analytics/xhub-express-bridge.mjs

Issue: https://github.com/hoanglamvu04/dothihoalac/issues/74

## Scope of this PR

1. Frontend tracker copied from X-HUB to client/src/utils/xhub-web-tracker.mjs.
2. Backend bridge copied to server/src/integrations/xhub-express-bridge.mjs.
3. Site-specific adapters enforce a public-route allowlist, prevent duplicate
   SPA page views, send article content views only after successful load,
   anonymize search/filter/contact interactions, and report lead submissions
   strictly after the website's CRM API resolves successfully.
4. Consent preferences are explicit opt-in and revocable through the website's
   footer. No visitor cookie or persistent session ID is created. The only
   stored preference is the string "granted" or "denied"; ephemeral session
   UUIDs live only in memory while consent persists.
5. GPC/DNT overrides any local opt-in. No WA-001 request can be sent by default.
6. Express mounts a separate POST /api/xhub-analytics router only when explicitly
   enabled. Its private 16 KB JSON parser is BEFORE the existing 2 MB app
   parser, with Origin and Fetch Metadata checks, 30 req/min/IP limit, strict
   field validation, private-path exclusion and safe generic errors.
7. No frontend secret and no CRM form values are forwarded. GA4 configuration
   and existing /api/v1 lead/auth functionality are unchanged.

## Default configuration: OFF

Frontend build environment:

    VITE_XHUB_WEB_ANALYTICS_ENABLED=false

Server private environment:

    XHUB_WEB_ANALYTICS_ENABLED=false
    XHUB_WEB_ANALYTICS_SITE_ID=
    XHUB_WEB_ANALYTICS_SITE_TOKEN=
    XHUB_WEB_ANALYTICS_PUBLIC_HOST=

**Never** put SITE_TOKEN, database keys, provisioning output or the X-HUB bearer
into VITE_*, GitHub, client bundle, screenshots or issue comments.

## Operator approval gates before enabling anything

1. Confirm this exact repository/website origin and whether the site is the
   production host dothihoalac.vn or a separate portal/landing. The repository
   name alone is NOT evidence of data ownership.
2. Identify the correct X-HUB organization_id and workspace_id, then get
   explicit owner approval for a distinct analytics site source.
3. Confirm X-HUB migration 089, pseudonymization key, scoped RBAC
   web.analytics.read, retention and ingest are production-ready.
4. Provision the source with X-HUB trusted operator CLI; keep generated
   siteId/token PRIVATE on the approved backend host.
5. Confirm a **same-origin HTTPS reverse proxy**:
   https://<approved-public-host>/api/xhub-analytics -> the site's own Express
   backend /api/xhub-analytics. The public React site and its API presently
   use different DNS hosts; without this proxy the tracker endpoint WILL NOT
   reach the Express bridge. Do not expose the X-HUB host/token to browsers.
6. Review and approve privacy policy/notice, consent UI language and data
   collection scope. Leave the boolean feature flags false until these steps
   and staging acceptance are signed off.
7. Set XHUB_WEB_ANALYTICS_PUBLIC_HOST to the exact approved origin hostname
   only (no scheme/port). The website bridge accepts POST Origin exactly
   https://<approved-public-host>. Other hosts and missing Origin are 403.
8. Only then enable backend + frontend flags in a controlled staging release,
   check opt-out/GPC/DNT, and obtain a separate production deployment approval.

The endpoint returns 404 while disabled. If the operator turns it on with
missing/invalid server site credentials, it returns 503 but the main website
still starts. Invalid input gets 400/413; cross-origin gets 403; rate-limit
gets 429. No request should contain full URLs, user IDs, handles, phone, email,
IP, search/filter text, form bodies, GPS or raw referrer URLs.

## Staging verification

Frontend client/test suite and build:
- Tests cover default opt-out (0 calls), explicit opt-in, GPC/DNT, SPA
  deduplication, article event, search/filter contact privacy, private routes,
  consent withdrawal, and lead API failure vs success semantics.

Backend server/test suite:
- Disabled/misconfigured bridge fail closed, Origin denied, unexpected fields
  rejected, >16 KB gets 413, rapid posts get 429, and only allowlisted v1
  batches are forwarded to a fixed HTTPS X-HUB endpoint.

End-to-end checks after approved configuration:
- Initial/denied consent => 0 POST to /api/xhub-analytics.
- Consent true + GPC/DNT false => one public SPA page_view per route.
- View a real published article => content_view with entityType=article and
  public article slug only.
- Apply search or filter => search_used/filter_used without query/values.
- Submit lead => lead_submitted only after HTTP success (not on click/error).
- Revoke consent => new events stop immediately and queued events are dropped.
- Verify X-HUB summary for only the approved site/workspace, and that top
  pages/UTM campaign appear only once >=3 distinct consenting sessions exist.

This PR does NOT run production migrations, provision any site source,
configure Nginx, install website/VPS secrets, submit data to X-HUB or deploy.
No cross-site visitor identity graph, CRM backfill or marketing automation.
