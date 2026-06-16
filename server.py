"""
yt-vault web server — FastAPI wrapper around yt.py.

Serves the reading-room UI and a small JSON API:
    GET  /                  → the app
    GET  /api/library       → list saved transcripts (metadata only)
    GET  /api/note/{file}   → one transcript (full)
    POST /api/fetch {url}   → fetch a video, write its note, return it

Local tool — binds to 127.0.0.1. Public data only.
"""
import re
import sys
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.responses import HTMLResponse, Response
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

sys.path.insert(0, str(Path(__file__).parent))
import yt  # noqa: E402  (reuse fetch / write_note / DEFAULT_LIB)

LIB = yt.DEFAULT_LIB
WEB = Path(__file__).parent / "web"

app = FastAPI(title="yt-vault")


class FetchReq(BaseModel):
    url: str


def parse_note(p: Path) -> dict:
    text = p.read_text(encoding="utf-8")
    parts = text.split("---", 2)
    meta, body = {}, text
    if len(parts) >= 3:
        for line in parts[1].splitlines():
            if ":" in line:
                k, _, v = line.partition(":")
                meta[k.strip()] = v.strip().strip('"')
        body = parts[2]

    desc, transcript = "", ""
    seg = re.split(r"\n## Transcript[^\n]*\n", body, maxsplit=1)
    if len(seg) == 2:
        transcript = seg[1].strip()
        dm = re.split(r"\n## Description\n", seg[0], maxsplit=1)
        desc = dm[1].strip() if len(dm) == 2 else ""

    return {
        "file": p.name,
        "title": meta.get("title", p.stem).strip('"'),
        "channel": (meta.get("channel") or "").strip('"'),
        "published": meta.get("published"),
        "duration": meta.get("duration"),
        "views": meta.get("views"),
        "url": meta.get("url"),
        "video_id": meta.get("video_id"),
        "transcript_kind": meta.get("transcript"),
        "fetched": meta.get("fetched"),
        "description": desc,
        "transcript": transcript,
        "mtime": p.stat().st_mtime,
    }


def _card(d: dict) -> dict:
    return {k: d[k] for k in (
        "file", "title", "channel", "published", "duration",
        "views", "video_id", "transcript_kind", "fetched", "mtime",
    )}


@app.get("/", response_class=HTMLResponse)
def index():
    return (WEB / "index.html").read_text(encoding="utf-8")


@app.get("/read", response_class=HTMLResponse)
def read_room():
    return (WEB / "read.html").read_text(encoding="utf-8")


@app.get("/api/library")
def library():
    items = []
    if LIB.exists():
        for p in LIB.glob("*.md"):
            if p.name == "INDEX.md":
                continue
            try:
                items.append(_card(parse_note(p)))
            except Exception:
                pass
    items.sort(key=lambda x: x["mtime"], reverse=True)  # newest first
    return items


@app.get("/api/note/{file}")
def note(file: str):
    p = (LIB / file).resolve()
    if LIB.resolve() not in p.parents or not p.exists() or p.suffix != ".md":
        raise HTTPException(404, "note not found")
    return parse_note(p)


@app.get("/api/download/{file}")
def download(file: str):
    p = (LIB / file).resolve()
    if LIB.resolve() not in p.parents or not p.exists() or p.suffix != ".md":
        raise HTTPException(404, "note not found")
    return Response(
        p.read_text(encoding="utf-8"),
        media_type="text/markdown; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{file}"'},
    )


@app.post("/api/fetch")
def do_fetch(req: FetchReq):
    url = (req.url or "").strip()
    if not url:
        raise HTTPException(400, "no url")
    try:
        info, transcript, kind = yt.fetch(url, want_transcript=True)
    except Exception as e:
        raise HTTPException(400, f"could not fetch that video: {e}")
    fp = yt.write_note(info, transcript, kind, LIB)
    return parse_note(fp)


app.mount("/web", StaticFiles(directory=str(WEB)), name="web")


if __name__ == "__main__":
    import uvicorn
    print("yt-vault → http://127.0.0.1:8765")
    uvicorn.run(app, host="127.0.0.1", port=8765, log_level="warning")
