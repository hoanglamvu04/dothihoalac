#!/usr/bin/env python3
"""Explicit editorial import via the existing authenticated DTHL CMS API.
No DB access, seeds, deployments, credentials in files, or updates to existing posts.
"""
import argparse
import getpass
import html
import http.cookiejar
import json
import re
import sys
import unicodedata
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

API = "https://api.dothihoalac.vn/api/v1"
SITE = "https://dothihoalac.vn"
ROOT = Path(__file__).resolve().parent

class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None

def opener(auth=False):
    handlers = [NoRedirect()]
    if auth:
        handlers.append(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
    return urllib.request.build_opener(*handlers)

def request(client, path, payload=None):
    data = None if payload is None else json.dumps(payload, ensure_ascii=False).encode("utf-8")
    req = urllib.request.Request(API + path, data=data, headers={
        "Accept": "application/json", "Content-Type": "application/json",
        "User-Agent": "DTHL-Editorial-Import/1.0", "Origin": SITE,
    })
    try:
        with client.open(req, timeout=35) as res:
            result = json.load(res)
    except urllib.error.HTTPError as exc:
        raise RuntimeError(f"{path.split('?')[0]}: HTTP {exc.code}; inspect CMS before retrying.") from None
    if not isinstance(result, dict) or result.get("success") is not True:
        raise RuntimeError(f"{path.split('?')[0]}: unexpected API response")
    return result

def plain(s):
    return html.escape(s, quote=True)

def inline(s):
    pieces, last = [], 0
    for m in re.finditer(r"\[([^\]\n]+)\]\(([^)\s]+)\)", s):
        pieces.append(plain(s[last:m.start()]))
        url = m.group(2)
        if url.startswith("/") and not url.startswith("//"):
            url = SITE + url
        parts = urllib.parse.urlsplit(url)
        if parts.scheme != "https" or not parts.hostname or parts.username or parts.password:
            raise ValueError("Unsafe link in source")
        pieces.append('<a href="' + plain(url) + '">' + plain(m.group(1)) + '</a>')
        last = m.end()
    pieces.append(plain(s[last:]))
    return "".join(pieces)

def render(md):
    out, paragraph, kind = [], [], None
    def flush():
        if paragraph:
            text = " ".join(paragraph)
            if text.startswith("*") and text.endswith("*"):
                out.append("<p><em>" + inline(text[1:-1]) + "</em></p>")
            else:
                out.append("<p>" + inline(text) + "</p>")
            paragraph.clear()
    def close_list():
        nonlocal kind
        if kind:
            out.append("</" + kind + ">")
            kind = None
    for line in md.splitlines():
        line = line.strip()
        heading = re.match(r"^(#{2,3})\s+(.+)$", line)
        bullet = re.match(r"^(-|\d+\.)\s+(.+)$", line)
        if not line:
            flush()
            close_list()
        elif heading:
            flush()
            close_list()
            tag = "h" + str(len(heading.group(1)))
            out.append("<" + tag + ">" + inline(heading.group(2)) + "</" + tag + ">")
        elif bullet:
            flush()
            target = "ul" if bullet.group(1) == "-" else "ol"
            if kind != target:
                close_list()
                kind = target
                out.append("<" + kind + ">")
            out.append("<li>" + inline(bullet.group(2)) + "</li>")
        else:
            close_list()
            paragraph.append(line)
    flush()
    close_list()
    return "\n".join(out)

def normalize(text):
    value = unicodedata.normalize("NFD", str(text).lower().replace("đ", "d"))
    return " ".join(re.sub(r"[^a-z0-9 ]", " ", "".join(c for c in value if not unicodedata.combining(c))).split())

def load_batch():
    manifest = json.loads((ROOT / "manifest-dot-02.json").read_text(encoding="utf-8"))
    rows = manifest["items"]
    if len(rows) != 20 or len({r["id"] for r in rows}) != 20 or len({r["slug"] for r in rows}) != 20:
        raise ValueError("Unexpected manifest")
    for r in rows:
        if not re.fullmatch(r"DTHL-SEO02-(0[1-9]|1[0-9]|20)", r["id"]):
            raise ValueError("Unexpected ID")
        name = Path(r["path"]).name
        if not re.fullmatch(r"[a-z0-9-]+\.md", name):
            raise ValueError("Unexpected article filename")
        raw = (ROOT / "articles" / "dot-02" / name).read_text(encoding="utf-8")
        front = re.fullmatch(r"---\n(.*?)\n---\n\n# ([^\n]+)\n\n(.*)", raw, flags=re.S)
        if not front:
            raise ValueError("Invalid article format: " + name)
        metadata = dict((k, json.loads(v)) for k, v in (l.split(": ", 1) for l in front.group(1).splitlines()))
        for key in ("id", "slug", "title", "summary", "category", "articleType"):
            if metadata[key] != r[key]:
                raise ValueError("Manifest mismatch: " + name)
        if front.group(2) != r["title"] or len(front.group(3).split()) < 400 or "\n## Nguồn tham khảo\n" not in front.group(3):
            raise ValueError("Incomplete article: " + name)
        r["bodyHtml"] = render(front.group(3))
        if r["bodyHtml"].count("<h2>") < 3 or "<a href=" not in r["bodyHtml"]:
            raise ValueError("Rendered content invalid: " + name)
    return rows

def list_articles(client):
    seen = {}
    for page in range(1, 101):
        res = request(client, "/admin/articles?" + urllib.parse.urlencode({"page": page, "limit": 100}))
        items = res.get("data")
        meta = res.get("meta") or {}
        if not isinstance(items, list):
            raise RuntimeError("Cannot verify existing articles")
        for item in items:
            if not item.get("_id"):
                raise RuntimeError("Invalid CMS record")
            seen[str(item["_id"])] = item
        total = meta.get("total")
        pages = meta.get("totalPages")
        if not isinstance(total, int) or not isinstance(pages, int):
            raise RuntimeError("Cannot verify CMS pagination; abort before writing.")
        if page >= pages:
            if len(seen) != total:
                raise RuntimeError("CMS changed during scan; retry before writing.")
            return list(seen.values())
    raise RuntimeError("Too many CMS pages; abort before writing.")

def print_url(item, public):
    slug = item.get("slug")
    if not slug or not re.fullmatch(r"[a-z0-9-]+", slug):
        print("  URL unavailable: unexpected CMS slug")
        return
    url = SITE + "/tin-tuc/" + slug
    if item.get("status") == "published" and item.get("visibility") == "public":
        try:
            result = request(public, "/articles/" + slug)
            if not isinstance(result.get("data"), dict) or result["data"].get("slug") != slug:
                raise RuntimeError("unexpected public response")
            print("  API PUBLIC OK: " + url)
        except (RuntimeError, OSError, ValueError):
            print("  PUBLIC API NOT VERIFIED: " + url)
    else:
        print("  " + str(item.get("status")) + " (CMS only): " + url)

def run():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--check", action="store_true", help="Validate files only, no network")
    p.add_argument("--publish", action="store_true", help="Create public articles after explicit editorial confirmation; otherwise draft")
    p.add_argument("--only", choices=[f"{n:02d}" for n in range(1,21)], help="Select one article")
    args = p.parse_args()
    rows = load_batch()
    print(f"Content validation: {len(rows)}/20")
    if args.check:
        return
    selected = [r for r in rows if not args.only or r["id"].endswith("-" + args.only)]
    public, auth = opener(), opener(True)
    taxonomy = request(public, "/taxonomy/bootstrap")["data"]
    cats = {r["slug"]: str(r["_id"]) for r in taxonomy["categories"] if r.get("contentScope") in ("article", "all")}
    areas = {r["slug"]: str(r["_id"]) for r in taxonomy["areas"]}
    if any(r["category"] not in cats for r in selected) or "hoa-lac" not in areas:
        raise RuntimeError("Missing active taxonomy; no changes made.")
    identifier = input("CMS admin email/username: ").strip()
    password = getpass.getpass("CMS admin password (hidden): ")
    request(auth, "/auth/login", {"identifier": identifier, "password": password})
    del password
    try:
        existing = list_articles(auth)
        plan = []
        for r in selected:
            title = normalize(r["title"])
            proposed = title.replace(" ", "-")
            matches = [i for i in existing if normalize(i.get("title", "")) == title or i.get("slug") in (r["slug"], proposed) or str((i.get("article") or {}).get("sourceNote", "")).startswith(r["id"] + " |")]
            if matches:
                for item in matches:
                    print("SKIP existing:", r["id"], item.get("title"))
                    print_url(item, public)
                continue
            # Show possible same-topic existing articles for manual editorial review.
            keyword = normalize(r["primaryKeyword"])
            related = [i.get("title", "") for i in existing if keyword in normalize(i.get("title", ""))]
            if related:
                print("REVIEW possible overlap:", r["id"], " | ".join(related[:6]))
            plan.append(r)
        print(f"New articles: {len(plan)}; existing: {len(selected)-len(plan)}")
        for r in plan:
            print(r["id"], r["title"])
        if not plan:
            return
        confirmation = "PUBLISH" if args.publish else "IMPORT"
        print("Review source links, factual claims, topic overlap and image rights before publication.")
        if input(f"Type {confirmation} to confirm this CMS write: ").strip() != confirmation:
            print("Cancelled; no articles created.")
            return
        for r in plan:
            # Never retry ambiguous POST automatically, never patch existing content.
            payload = {
                "title": r["title"], "summary": r["summary"], "bodyHtml": r["bodyHtml"],
                "articleType": r["articleType"], "status": "published" if args.publish else "draft",
                "primaryCategoryId": cats[r["category"]], "categoryIds": [cats[r["category"]]],
                "primaryAreaId": areas["hoa-lac"], "areaIds": [areas["hoa-lac"]],
                "sourceNote": r["id"] + " | DTHL SEO dot 02, editorial source links in article body.",
            }
            item = request(auth, "/admin/articles", payload)["data"]
            print("CREATED", r["id"], item.get("title"))
            print_url(item, public)
        print("Done. CMS-generated URLs above; verify web page and sitemap separately.")
    finally:
        try:
            request(auth, "/auth/logout", {})
        except Exception:
            print("Logout could not be verified; revoke this session in account settings if needed.", file=sys.stderr)

if __name__ == "__main__":
    try:
        run()
    except (Exception, KeyboardInterrupt) as exc:
        print(f"STOP: {type(exc).__name__}: {exc}", file=sys.stderr)
        sys.exit(1)
