"use strict";

const $ = (s) => document.querySelector(s);
const listEl = $("#list");
const countEl = $("#count");
const shelfEmpty = $("#shelfEmpty");
const readerEmpty = $("#readerEmpty");
const readerBody = $("#readerBody");
const reader = $("#reader");
const statusEl = $("#status");

let library = [];
let activeFile = null;

const esc = (s) => (s ?? "").toString()
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const fmtViews = (v) => {
  const n = parseInt(v, 10);
  if (!n) return null;
  if (n >= 1e6) return (n / 1e6).toFixed(1) + "M views";
  if (n >= 1e3) return (n / 1e3).toFixed(1) + "k views";
  return n + " views";
};

/* ---------- status ---------- */
function setStatus(msg, kind = "") {
  statusEl.textContent = msg || "";
  statusEl.className = "status" + (kind ? " " + kind : "");
}

/* ---------- shelf ---------- */
function renderList() {
  const q = ($("#filter").value || "").toLowerCase().trim();
  const items = q
    ? library.filter((d) => (d.title + " " + d.channel).toLowerCase().includes(q))
    : library;

  countEl.textContent = library.length;
  shelfEmpty.hidden = library.length > 0;
  listEl.innerHTML = "";

  for (const d of items) {
    const li = document.createElement("li");
    const btn = document.createElement("button");
    btn.className = "list-item" + (d.file === activeFile ? " active" : "");
    btn.type = "button";
    const tag = d.transcript_kind && d.transcript_kind !== "none"
      ? `<span class="li-tag">${esc(d.transcript_kind)}</span>`
      : `<span class="li-tag none">no transcript</span>`;
    btn.innerHTML =
      `<span class="li-title">${esc(d.title)}</span>` +
      `<span class="li-meta">${esc(d.channel || "—")} ${tag}</span>`;
    btn.addEventListener("click", () => selectNote(d.file));
    li.appendChild(btn);
    listEl.appendChild(li);
  }
}

/* ---------- reader ---------- */
function showSkeleton() {
  readerEmpty.hidden = true;
  readerBody.hidden = false;
  readerBody.innerHTML =
    `<div class="skeleton">
       <div class="sk sk-title"></div><div class="sk sk-meta"></div>
       <div class="sk sk-line m"></div><div class="sk sk-line s"></div>
       <div class="sk sk-line m"></div><div class="sk sk-line x"></div>
       <div class="sk sk-line s"></div><div class="sk sk-line m"></div>
     </div>`;
}

function renderReader(d) {
  readerEmpty.hidden = true;
  readerBody.hidden = false;

  const meta = [];
  if (d.channel) meta.push(esc(d.channel));
  if (d.published && d.published !== "null") meta.push(esc(d.published));
  if (d.duration) meta.push(esc(d.duration));
  const views = fmtViews(d.views);
  if (views) meta.push(views);
  if (d.url) meta.push(`<a href="${esc(d.url)}" target="_blank" rel="noreferrer">Watch on YouTube</a>`);

  const hasTr = d.transcript && d.transcript.trim();
  const kicker = hasTr ? `Transcript · ${esc(d.transcript_kind || "")}` : "Metadata only";

  readerBody.innerHTML =
    `<p class="doc-kicker">${kicker}</p>
     <h2 class="doc-title">${esc(d.title)}</h2>
     <div class="doc-meta">${meta.join('<span aria-hidden="true">·</span>')}</div>
     <div class="doc-actions">
       <button class="ghost-btn" data-act="ai">Copy for AI</button>
       <button class="ghost-btn" data-act="tr">Copy transcript</button>
     </div>` +
    (d.description
      ? `<p class="doc-section-label">Description</p><div class="doc-desc">${esc(d.description)}</div>`
      : "") +
    `<p class="doc-section-label">Transcript</p>` +
    (hasTr
      ? `<div class="doc-transcript">${esc(d.transcript)}</div>`
      : `<div class="doc-transcript empty">No captions were available for this video.</div>`);

  readerBody.querySelector('[data-act="tr"]').addEventListener("click", (e) =>
    copy(d.transcript || "", e.target));
  readerBody.querySelector('[data-act="ai"]').addEventListener("click", (e) =>
    copy(forAI(d), e.target));

  reader.focus({ preventScroll: false });
  if (window.matchMedia("(max-width: 880px)").matches) reader.scrollIntoView({ behavior: "smooth", block: "start" });
}

function forAI(d) {
  return `Title: ${d.title}\nChannel: ${d.channel}\nURL: ${d.url}\n\n` +
    (d.transcript ? `Transcript:\n${d.transcript}` : "(no transcript available)");
}

async function copy(text, btn) {
  try {
    await navigator.clipboard.writeText(text);
    const old = btn.textContent;
    btn.textContent = "Copied";
    setTimeout(() => (btn.textContent = old), 1400);
  } catch {
    setStatus("Couldn't copy to clipboard.", "error");
  }
}

async function selectNote(file) {
  activeFile = file;
  renderList();
  showSkeleton();
  try {
    const r = await fetch(`/api/note/${encodeURIComponent(file)}`);
    if (!r.ok) throw new Error("not found");
    renderReader(await r.json());
  } catch {
    setStatus("Could not open that transcript.", "error");
    readerBody.hidden = true; readerEmpty.hidden = false;
  }
}

/* ---------- data ---------- */
async function loadLibrary() {
  try {
    const r = await fetch("/api/library");
    library = await r.json();
    renderList();
  } catch {
    setStatus("Could not reach the server.", "error");
  }
}

/* ---------- fetch new ---------- */
$("#fetchForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const url = $("#urlInput").value.trim();
  if (!url) return;
  const btn = $("#fetchBtn");
  btn.disabled = true; btn.textContent = "Fetching…";
  setStatus("Pulling metadata and captions… this can take a few seconds.");
  showSkeleton();
  try {
    const r = await fetch("/api/fetch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.detail || "fetch failed");
    activeFile = data.file;
    library = library.filter((d) => d.file !== data.file);
    library.unshift(data);
    renderList();
    renderReader(data);
    $("#urlInput").value = "";
    setStatus(
      data.transcript ? "Saved to your reading room." : "Saved (no captions on this one).",
      "ok"
    );
  } catch (err) {
    readerBody.hidden = true; readerEmpty.hidden = false;
    setStatus(String(err.message || err).replace(/^Error:\s*/, ""), "error");
  } finally {
    btn.disabled = false; btn.textContent = "Get transcript";
  }
});

$("#filter").addEventListener("input", renderList);

/* ---------- theme ---------- */
const root = document.documentElement;
const saved = localStorage.getItem("ytv-theme");
if (saved) root.dataset.theme = saved;
$("#themeToggle").addEventListener("click", () => {
  const next = root.dataset.theme === "light" ? "dark" : "light";
  root.dataset.theme = next;
  localStorage.setItem("ytv-theme", next);
});

loadLibrary();
