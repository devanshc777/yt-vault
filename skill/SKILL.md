---
name: yt-vault
description: Fetch a YouTube video's transcript + metadata as a clean markdown file using the local yt-vault CLI. Use when the user pastes a YouTube link (or video id) and wants the transcript, captions, "the words", notes, or to read/summarize/feed a video to an AI; also for searching YouTube and bulk-grabbing transcripts by topic. Runs locally via yt-dlp, saves markdown to a folder the user owns.
---

# yt-vault — call the local YouTube→transcript tool

yt-vault lives at `C:\Dev\python\projects\yt-vault` (FastAPI app + a `yt.py` CLI built on yt-dlp).
This skill drives the **CLI** so transcripts can be fetched without opening the web app. Public data
only (metadata + captions). Everything saves as markdown with YAML frontmatter.

## When to use
- User gives a YouTube URL/id and wants: the transcript, "the words", captions, notes, a summary, or
  "feed this video to you". → fetch, then read the saved file and work from it.
- User wants to find videos on a topic, or grab transcripts for the top N results.

## How to call

Always set UTF-8 (notes contain unicode) and run from the project dir with `uv`:

```bash
cd "C:/Dev/python/projects/yt-vault" && export PYTHONIOENCODING=utf-8 && \
  uv run python yt.py get "<URL_OR_ID>"
```

- One video → one markdown note. The command prints the saved path (default under `./library/`).
- Then **Read** that file to use the transcript (don't re-fetch).

Other subcommands:
```bash
uv run python yt.py search "topic" -n 10     # list results (title · channel · id)
uv run python yt.py grab "topic" -n 5        # search + fetch top N transcripts
uv run python yt.py index                    # rebuild library/INDEX.md
```

## Options
- `--out` and `--cookies-from-browser` are **global** flags — put them *before* the subcommand:
  `uv run python yt.py --out "<dir>" --cookies-from-browser firefox get "<URL>"`
  (or set `YT_VAULT_DIR=<dir>` / `YT_VAULT_COOKIES=firefox` in the env instead).
- Save somewhere specific (e.g. an Obsidian vault): `--out "<dir>"` or `YT_VAULT_DIR=<dir>`.
- Rate-limit wall (`HTTP 429`): YouTube throttles caption fetches per IP. Use the cookies flag above
  and/or wait for the cooldown. Firefox is most reliable; recent Chrome builds fail with a DPAPI error.
  **Named failure: "fight the 429."** Symptom: `transcript: none` + 429 on `en`, repeating across retries.
  Wrong instinct: retry, update yt-dlp, or download audio for Whisper. On 2026-10-12 all failed (no Firefox
  on this box; audio 403 even on latest yt-dlp; 30s-spaced retries still 429'd). Correct move: open the video
  in the built-in browser, hook the page's XHR/fetch for `timedtext` + `lang=en`, toggle the player's caption
  module off/on (`movie_player.unloadModule/loadModule('captions')`, `setOption('captions','track',{languageCode:'en',kind:'asr'})`),
  parse the captured `json3` (`events[].segs[].utf8`). Worked for 2/2 videos, measured.
  **Check the capture is the video, not an ad.** A pre-roll ad serves its own captions: 2026-10-12 a 668s video
  returned 261 words of a workshop ad, plausible on its face. Compare words to `movie_player.getDuration()`
  (speech runs ~2 words/s) and check `.ad-showing` is absent before trusting it.
- The note (metadata) saves even when captions aren't available — check the printed result.

## Notes
- If `uv` isn't found, the project may need `uv sync` once first.
- For the full web experience (reading room, scenes, widgets) instead of the CLI, start the server:
  `uv run python server.py` → http://127.0.0.1:8765 . But for "just get me the transcript", the CLI
  above is faster and needs no server.
- Project details / design spec: the repo's `README.md` and its (gitignored) `CLAUDE.md`.
