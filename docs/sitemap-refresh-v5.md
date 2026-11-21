# DTHL V5 — Automatic production sitemap refresh

## Why
React/Vite's sitemap is generated at frontend build time. Without refreshing,
newly published news, community, property and job posts may not appear in the
sitemap until the next deployment.

## Schedule and triggers

GitHub Actions workflow: DTHL Production Sitemap Refresh

- Runs every 3 hours at minute 17 (UTC)
- Runs after a successful Deploy Do Thi Hoa Lac VPS workflow
- Supports a manual "Run workflow" action
- Serializes with deploy and database backups using the shared production
  concurrency group. Does not restart PM2 and does not build React again.

## Safety design

The VPS runs client/scripts/refresh-sitemap-production.sh.

1. Verify the local database-backed API is ready.
2. Build sitemap files from 127.0.0.1:5000/api/v1 into a temporary staging
   directory within client/dist; the repo source files are untouched.
3. Validate combined XML, site URLs, core areas and dynamic article/community/
   property lists. Jobs may be zero if there are no published job listings.
4. Reject the refresh if any collection request failed, even if earlier API
   calls succeeded.
5. Atomically replace each diagnostic XML file, then sitemap-status.json,
   then the combined sitemap.xml last.
6. Clean up the temporary staging directory.

If any fetch or verification step fails, the existing public sitemap.xml stays
available. GitHub Actions records a failure and opens/updates the deduplicated
issue "[AUTO] DTHL sitemap refresh failed". A successful later run closes it.

## Verify production

- https://dothihoalac.vn/sitemap.xml is a single XML urlset.
- https://dothihoalac.vn/sitemap-status.json contains generatedAt, API source,
  counts and an empty unavailableCollections array.
- The GitHub workflow reports SUCCESS.
- Newly published articles appear as /tin-tuc/<slug> URLs after a successful
  refresh; they are not indexed by Google instantly and Search Console may
  choose to crawl later.

The file is public XML only. No authorization cookie, private article or draft
data should be added to the sitemap. The generator uses existing public feed
endpoints and their public visibility filters.

## Limitations

- The sitemap reflects content at the last successful refresh, not real time.
- This does not submit or guarantee indexing in Google Search Console.
- This does not change Nginx cache headers. Confirm that CDN/proxy caching
  of sitemap.xml is not excessively long if updates appear delayed.
