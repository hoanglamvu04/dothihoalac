# WA-002 — Đô thị Hòa Lạc ↔ X-HUB Web Intelligence (staging handoff)

Issue: https://github.com/hoanglamvu04/dothihoalac/issues/74

X-HUB source of truth:
- docs/integrations/WEB_ANALYTICS_WA001.md
- docs/integrations/WA001_SITE_HANDOFF.md
- integrations/web-analytics/xhub-web-tracker.mjs
- integrations/web-analytics/xhub-express-bridge.mjs

## Not production-ready

- X-HUB migration 089, database, and source identity are not approved for production.
- Do not assume the similarly named landing site and this repository share one source.
- A data owner must approve the host, X-HUB organization and workspace.
- Two flags default to OFF. This PR neither provisions a token nor deploys.
- GA4, CMS, CRM and login remain unchanged. GA4 consent is reviewed separately.

## Components

Frontend:
- client/src/utils/xhub-web-tracker.mjs — vendored WA-001 tracker, random in-memory session, no bearer
- client/src/utils/xhub-analytics-policy.mjs — public route categories only
- client/src/utils/xhub-intelligence.mjs — isolated adapter, opt-in, GPC/DNT, withdrawal
- client/src/components/layout/XHubAnalyticsConsent.jsx — explicit accept/reject/settings UI

Backend:
- server/src/integrations/xhub-express-bridge.mjs — backend-only token forwarder
- server/src/integrations/xhub-payload.guard.mjs — rejects extra fields/PII BEFORE forwarding
- server/src/integrations/xhubAnalytics.mount.js — 16 KB JSON parser, rate limiter and fail-closed gate

## Event map

| Event | Trigger |
|---|---|
| page_view | Public SPA pathname navigation once per route, not rerenders |
| content_view | After successful article detail API; public article slug only |
| search_used | User submits search in News, Search, Property and Jobs |
| filter_used | User applies filters, never query/option values |
| contact_click | Click on contact/call/Zalo links, never phone or href |
| form_started | First focus in lead form, no field contents |
| lead_submitted | Only after leadApi.create() succeeds; no CRM fields |

Paths are category-only (for example /tin-tuc), never full URLs, search
queries, URL hashes, user/account IDs, contact details or form contents.
Session UUID is random in memory. No cross-site visitor identity.
UTM tags and referrer host are sanitized and do not include raw query text.

## Approval flags (leave disabled)

Frontend build environment:

    VITE_XHUB_ANALYTICS_APPROVED=false

Backend private environment:

    XHUB_WEB_ANALYTICS_ENABLED=false
    XHUB_WEB_ANALYTICS_SITE_ID=
    XHUB_WEB_ANALYTICS_SITE_TOKEN=
    XHUB_WEB_ANALYTICS_PUBLIC_HOST=

Only a trusted X-HUB operator creates the approved siteId/token after
migration 089 and org/workspace scope approval. Store token in backend secret
manager, never in VITE_ variables, public JS, issue, Git history or logs.
Incomplete or invalid backend settings simply disable the bridge and leave
the website functional.

## Same-origin Nginx proxy, NOT deployed by this PR

The public React frontend requires /api/xhub-analytics on the SAME approved
website origin. Sending directly to hub.holaspace.vn or the API subdomain
is forbidden. This is an example for the eventual approved website vhost
only; verify the real backend port with DevOps before adapting:

    location = /api/xhub-analytics {
        limit_except POST { deny all; }
        client_max_body_size 16k;
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Origin $http_origin;
        proxy_set_header Sec-Fetch-Site $http_sec_fetch_site;
        proxy_connect_timeout 3s;
        proxy_read_timeout 7s;
    }

Review the existing Nginx config and run nginx -t before a separately
approved reload. Do not alter any other site or X-HUB vhost. Until the
proxy exists and both feature gates plus visitor consent are enabled,
the new integration remains inactive.

## Tests

Frontend:

    cd client
    node --test tests/xhubAnalytics.test.mjs tests/leadTelemetry.test.mjs
    npm run build

Backend:

    cd server
    node --test tests/integration/xhubAnalytics.test.js
    npm test

Acceptance requires:
1. Unapproved, opt-out, GPC and DNT -> zero analytics requests.
2. Opt-in -> schemaVersion 1, one public page_view per navigation,
   content_view after article API success.
3. Search/filter event has no keyword, GPS or filter value.
4. Rejected lead API -> no lead_submitted; success -> exactly one.
5. Foreign/no Origin, oversized JSON, burst, unknown fields/PII -> reject
   before upstream; missing backend env leaves the website running.
6. Confirm no X-HUB site token in frontend bundle.
7. After actual source approval: staging opt-in -> website bridge ->
   X-HUB ingest -> summary in the CORRECT organization/workspace.
   Test withdrawal and GPC/DNT on actual browser.
8. Campaign detail appears only with at least three eligible sessions;
   do not assert production DB or dashboard verification before testing.

## Separate approval gates before any release

- DB Architect and DevOps approve and migrate X-HUB 089 through isolated PG16
  testing and their separate release workflow.
- Data owner approves host + organizationId/workspaceId and provisions a
  dedicated source/token. Grant web.analytics.read only through governance.
- Website owner reviews privacy notice, consent UI and Nginx same-origin route.
- Perform staging E2E and review existing GA4 consent separately.

This PR is code/test-only. DO NOT merge into main or deploy production before
X-HUB database and source mapping are approved.
