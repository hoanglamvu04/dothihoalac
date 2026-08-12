# Source Watch

Lightweight source monitoring for DTHL. No Gemini/AI is used.

Supported source types:

- `rss`: RSS or Atom feed URL.
- `web`: a website listing page; optional `includePath` narrows links to article URLs.
- `facebook`: Facebook Page posts through Meta Graph API when the app/token has permission to read that Page.

Optional server environment variables:

```env
SOURCE_WATCH_ENABLED=true
SOURCE_WATCH_WORKER_INTERVAL_SECONDS=60
FACEBOOK_GRAPH_ACCESS_TOKEN=
```

Do not place `FACEBOOK_GRAPH_ACCESS_TOKEN` in the client environment or commit it to Git.

The first successful check establishes a baseline. Only items discovered on later checks are marked `new`.
