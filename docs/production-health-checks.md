# DTHL production health checks

## Three distinct checks

- GET /health: liveness only. HTTP 200 means Node can answer HTTP. It intentionally does not contact MongoDB.
- GET /api/v1/health: diagnostics, includes MongoDB driver state; HTTP 200 is not proof that MongoDB accepts queries.
- GET /api/v1/health/ready: HTTP 200 only if MongoDB reports connected AND answers a live ping within 2.5 seconds. HTTP 503 means the API is not ready to serve database-backed traffic. The body never exposes database credentials.

Production backend release uses /api/v1/health/ready for the PM2 restart gate. If the API is not ready, the server deployment restores its previous application revision and dependencies. The local API readiness URL is:

    http://127.0.0.1:5000/api/v1/health/ready

## Public production smoke

The DTHL Production Smoke Monitor workflow runs on schedule and after completion
of a Deploy Do Thi Hoa Lac VPS workflow run. It tests:

- Home page https://dothihoalac.vn/
- API liveness https://api.dothihoalac.vn/api/v1/health
- API readiness https://api.dothihoalac.vn/api/v1/health/ready
- Public article, community, property and job list APIs
- Sitemap https://dothihoalac.vn/sitemap.xml is an XML sitemap index

The workflow maintains a deduplicated GitHub issue for an unresolved failure. Test success indicates the routes were reachable from the GitHub runner; it does not prove every frontend interaction or admin workflow.

## Troubleshoot HTTP 502

1. Confirm DNS resolves and the API TLS certificate is valid; check the public /health and /ready separately.
2. On VPS, compare responses from localhost:5000 with https://api.dothihoalac.vn/api/v1/health/ready.
3. If localhost is healthy and public returns 502, inspect Nginx upstream proxy_pass, server_name, certificates and access/error logs; do not assume MongoDB is broken.
4. If readiness fails locally, inspect only the DTHL PM2 process (`pm2 logs dothihoalac-api --lines 100 --nostream`) and MongoDB connectivity.
5. If published content endpoints fail but readiness succeeds, inspect application errors and the specific module/route.
6. Never log MongoDB connection URIs, JWT cookies, authorization headers or other customer secrets.

## Release acceptance

Accept a deployment only after readiness and all public smoke endpoints pass. A successful GitHub deployment job confirms server scripts completed, not necessarily that Search Console indexed the site.
