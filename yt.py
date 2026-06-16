#!/usr/bin/env python
"""
yt-vault — a tiny YouTube → local markdown vault.

Commands:
    search "<query>" [-n N]            list top results (table)
    get <url|id> [--no-transcript]     fetch one video → markdown note
    grab "<query>" [-n N] [--no-transcript]   search + fetch top N
    index                              (re)build INDEX.md over the library

Output: one markdown note per video (YAML frontmatter + metadata + transcript),
written to the library dir. Default library = ./library next to this file.
Override with --out <dir> or the YT_VAULT_DIR env var (e.g. point it at
C:\\Personal\\Aethion\\_raw\\youtube to land transcripts in the vault's raw layer).

Only public data (metadata + captions). No login, no personal data.
"""
import argparse
import json
import os
import re
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

DEFAULT_LIB = Path(os.environ.get("YT_VAULT_DIR", str(Path(__file__).parent / "library")))

# Optional ("chrome",)/("edge",)/("firefox",) — auth cookies clear most 429s.
COOKIES_BROWSER = os.environ.get("YT_VAULT_COOKIES") or None


# --------------------------------------------------------------------------- #
# yt-dlp helpers
# --------------------------------------------------------------------------- #
def _base_opts():
    opts = {
        "quiet": True, "no_warnings": True, "skip_download": True,
        "noprogress": True,
        "retries": 5, "extractor_retries": 3,
        "sleep_interval_requests": 1,
        # android/web_safari clients are far less rate-limited on captions
        "extractor_args": {"youtube": {"player_client": ["android", "web_safari", "web"]}},
    }
    if COOKIES_BROWSER:
        opts["cookiesfrombrowser"] = (COOKIES_BROWSER,)
    return opts


def _ydl(extra=None):
    import yt_dlp
    opts = _base_opts()
    if extra:
        opts.update(extra)
    return yt_dlp.YoutubeDL(opts)


def search(query, n):
    with _ydl({"extract_flat": True}) as y:
        info = y.extract_info(f"ytsearch{n}:{query}", download=False)
    out = []
    for e in info.get("entries", []) or []:
        if not e:
            continue
        out.append({
            "id": e.get("id"),
            "title": e.get("title"),
            "channel": e.get("channel") or e.get("uploader"),
            "duration": e.get("duration"),
            "views": e.get("view_count"),
            "url": f"https://youtu.be/{e.get('id')}",
        })
    return out


def _norm_target(t):
    return t if str(t).startswith("http") else f"https://youtu.be/{t}"


def _pick_json3(captions: dict):
    """Return a json3 caption URL, preferring English."""
    if not captions:
        return None
    for lang in captions:
        if lang.lower().startswith("en"):
            for f in captions[lang]:
                if f.get("ext") == "json3":
                    return f["url"]
    for lang in captions:
        for f in captions[lang]:
            if f.get("ext") == "json3":
                return f["url"]
    return None


def _parse_json3(path):
    data = json.load(open(path, encoding="utf-8"))
    parts = []
    for ev in data.get("events", []) or []:
        for seg in ev.get("segs", []) or []:
            txt = seg.get("utf8")
            if txt:
                parts.append(txt)
    text = "".join(parts)
    text = re.sub(r"[ \t]+\n", "\n", text)
    text = re.sub(r"\n{3,}", "\n\n", text).strip()
    return text or None


def get_transcript(info):
    """(text, kind) where kind = 'manual' | 'auto' | None.

    Uses yt-dlp's own subtitle downloader (it adds the params YouTube now
    requires) rather than a raw GET, which YouTube blocks.
    """
    import glob
    import tempfile
    import yt_dlp

    vid = info.get("id")
    manual_langs = set((info.get("subtitles") or {}).keys())
    with tempfile.TemporaryDirectory() as td:
        opts = _base_opts()
        opts.update({
            "writesubtitles": True, "writeautomaticsub": True,
            "subtitlesformat": "json3",
            "subtitleslangs": ["en.*", "en", "hi.*", "hi"],
            "sleep_interval_subtitles": 1,
            "outtmpl": str(Path(td) / "%(id)s.%(ext)s"),
        })
        # Don't let a 429 on a later language discard an earlier one that
        # already downloaded — glob for whatever landed regardless of errors.
        try:
            with yt_dlp.YoutubeDL(opts) as y:
                y.download([_norm_target(vid)])
        except Exception as e:
            print(f"  ! partial sub download ({e}); using whatever landed", file=sys.stderr)
        files = glob.glob(str(Path(td) / f"{vid}*.json3"))
        if not files:
            return None, None
        files.sort(key=lambda f: (0 if ".en" in Path(f).name.lower() else 1, f))
        chosen = files[0]
        text = _parse_json3(chosen)
        m = re.search(rf"{re.escape(vid)}\.([\w.-]+)\.json3$", Path(chosen).name)
        lang = m.group(1) if m else None
        kind = "manual" if (lang in manual_langs) else "auto"
        return (text, kind if text else None)


def fetch(target, want_transcript=True):
    with _ydl() as y:
        info = y.extract_info(_norm_target(target), download=False)
    transcript, kind = (None, None)
    if want_transcript:
        transcript, kind = get_transcript(info)
    return info, transcript, kind


# --------------------------------------------------------------------------- #
# formatting / writing
# --------------------------------------------------------------------------- #
def fmt_dur(s):
    if not s:
        return "?"
    s = int(s)
    return f"{s//3600}:{(s%3600)//60:02d}:{s%60:02d}" if s >= 3600 else f"{s//60}:{s%60:02d}"


def fmt_views(v):
    if not v:
        return "?"
    v = int(v)
    if v >= 1_000_000:
        return f"{v/1_000_000:.1f}M"
    if v >= 1_000:
        return f"{v/1_000:.1f}k"
    return str(v)


def slugify(s):
    return re.sub(r"[^a-z0-9]+", "-", (s or "video").lower()).strip("-")[:60] or "video"


def write_note(info, transcript, kind, outdir: Path):
    outdir.mkdir(parents=True, exist_ok=True)
    vid = info.get("id")
    title = info.get("title") or vid
    up = info.get("upload_date")
    published = f"{up[:4]}-{up[4:6]}-{up[6:]}" if up and len(up) == 8 else "null"
    channel = info.get("channel") or info.get("uploader")
    fp = outdir / f"{slugify(title)}-{vid}.md"

    lines = [
        "---",
        f"title: {json.dumps(title, ensure_ascii=False)}",
        "type: reference",
        "area: knowledge",
        "source: youtube",
        f"url: https://youtu.be/{vid}",
        f"video_id: {vid}",
        f"channel: {json.dumps(channel, ensure_ascii=False)}",
        f"published: {published}",
        f"duration: {fmt_dur(info.get('duration'))}",
        f"views: {info.get('view_count') or 'null'}",
        f"transcript: {kind or 'none'}",
        f"fetched: {datetime.now(timezone.utc).date().isoformat()}",
        "tags: [youtube, source, transcript]",
        "---",
        "",
        f"# {title}",
        "",
        f"**Channel:** {channel}  ·  **Published:** {published}  ·  "
        f"**Duration:** {fmt_dur(info.get('duration'))}  ·  **Views:** {fmt_views(info.get('view_count'))}",
        f"**URL:** https://youtu.be/{vid}",
        "",
        "## Description",
        "",
        (info.get("description") or "_(none)_").strip(),
        "",
        f"## Transcript ({kind})" if kind else "## Transcript",
        "",
        transcript or "_No transcript / captions available._",
        "",
    ]
    fp.write_text("\n".join(lines), encoding="utf-8")
    return fp


def build_index(outdir: Path):
    rows = []
    for f in sorted(outdir.glob("*.md")):
        if f.name == "INDEX.md":
            continue
        head = f.read_text(encoding="utf-8").split("---", 2)
        meta = {}
        if len(head) >= 3:
            for line in head[1].splitlines():
                if ":" in line:
                    k, _, v = line.partition(":")
                    meta[k.strip()] = v.strip().strip('"')
        rows.append((meta.get("title", f.stem), meta.get("channel", "?"),
                     meta.get("published", "?"), meta.get("duration", "?"),
                     meta.get("transcript", "?"), f.name))
    out = ["# YouTube Vault — Index", "",
           f"_{len(rows)} videos · rebuilt {datetime.now(timezone.utc).date().isoformat()}_", "",
           "| Title | Channel | Published | Dur | Transcript | File |",
           "|---|---|---|---|---|---|"]
    for t, c, p, d, tr, fn in rows:
        out.append(f"| {t[:50]} | {c} | {p} | {d} | {tr} | [{fn}]({fn}) |")
    (outdir / "INDEX.md").write_text("\n".join(out), encoding="utf-8")
    return len(rows)


# --------------------------------------------------------------------------- #
# CLI
# --------------------------------------------------------------------------- #
def cmd_search(a):
    rows = search(a.query, a.n)
    print(f"\n{'#':<3}{'DURATION':<10}{'VIEWS':<9}{'CHANNEL':<24}TITLE")
    for i, r in enumerate(rows, 1):
        print(f"{i:<3}{fmt_dur(r['duration']):<10}{fmt_views(r['views']):<9}"
              f"{(r['channel'] or '?')[:22]:<24}{(r['title'] or '')[:60]}")
        print(f"   {r['url']}")
    return rows


def cmd_get(a):
    info, transcript, kind = fetch(a.target, want_transcript=not a.no_transcript)
    fp = write_note(info, transcript, kind, Path(a.out))
    print(f"✓ {info.get('title')}")
    print(f"  transcript: {kind or 'none'}  →  {fp}")


def cmd_grab(a):
    rows = search(a.query, a.n)
    print(f"grabbing {len(rows)} videos for '{a.query}' → {a.out}")
    for i, r in enumerate(rows, 1):
        try:
            info, transcript, kind = fetch(r["id"], want_transcript=not a.no_transcript)
            fp = write_note(info, transcript, kind, Path(a.out))
            print(f"  [{i}/{len(rows)}] ✓ {r['title'][:50]}  (transcript: {kind or 'none'})")
        except Exception as e:
            print(f"  [{i}/{len(rows)}] ✗ {r.get('title','?')[:50]}: {e}")
        if i < len(rows):
            time.sleep(a.sleep)   # pace requests to avoid 429 throttling
    n = build_index(Path(a.out))
    print(f"index rebuilt: {n} videos")


def cmd_index(a):
    n = build_index(Path(a.out))
    print(f"index rebuilt: {n} videos → {Path(a.out)/'INDEX.md'}")


def main():
    global COOKIES_BROWSER
    p = argparse.ArgumentParser(prog="yt", description="YouTube → local markdown vault")
    p.add_argument("--out", default=str(DEFAULT_LIB), help=f"library dir (default {DEFAULT_LIB})")
    p.add_argument("--cookies-from-browser", default=COOKIES_BROWSER,
                   help="browser to pull auth cookies from (chrome/edge/firefox) — clears most 429s")
    sub = p.add_subparsers(dest="cmd", required=True)

    s = sub.add_parser("search", help="list search results")
    s.add_argument("query"); s.add_argument("-n", type=int, default=10)
    s.set_defaults(func=cmd_search)

    g = sub.add_parser("get", help="fetch one video → note")
    g.add_argument("target", help="url or video id")
    g.add_argument("--no-transcript", action="store_true")
    g.set_defaults(func=cmd_get)

    gr = sub.add_parser("grab", help="search + fetch top N → notes")
    gr.add_argument("query"); gr.add_argument("-n", type=int, default=5)
    gr.add_argument("--no-transcript", action="store_true")
    gr.add_argument("--sleep", type=float, default=3.0, help="seconds between fetches (anti-429)")
    gr.set_defaults(func=cmd_grab)

    ix = sub.add_parser("index", help="rebuild INDEX.md")
    ix.set_defaults(func=cmd_index)

    a = p.parse_args()
    if a.cookies_from_browser:
        COOKIES_BROWSER = a.cookies_from_browser
    a.func(a)


if __name__ == "__main__":
    main()
