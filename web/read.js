"use strict";
const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);
const root = document.documentElement;
const body = document.body;
const store = {
  get: (k, d) => { try { const v = localStorage.getItem("ytv-" + k); return v === null ? d : JSON.parse(v); } catch { return d; } },
  set: (k, v) => localStorage.setItem("ytv-" + k, JSON.stringify(v)),
};
const esc = (s) => (s ?? "").toString().replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/* theme */
const st = localStorage.getItem("ytv-theme"); if (st) root.dataset.theme = st;
$("#themeToggle").addEventListener("click", () => { const n = root.dataset.theme === "light" ? "dark" : "light"; root.dataset.theme = n; localStorage.setItem("ytv-theme", n); });

/* ---------- rooms ---------- */
const ROOMS = [
  ["library", "Library", "linear-gradient(160deg,#6b4f2e,#241a10)"],
  ["cafe", "Café", "linear-gradient(160deg,#8a5a2b,#2a1c10)"],
  ["rain", "Rainy window", "linear-gradient(160deg,#41546f,#1b2433)"],
  ["lofi", "Lofi desk", "linear-gradient(160deg,#6a4b8a,#241a33)"],
  ["garden", "Garden", "linear-gradient(160deg,#3f6b4a,#16241a)"],
  ["dusk", "Dusk", "linear-gradient(160deg,#6a5a9a,#c06a48)"],
  ["paper", "Paper", "linear-gradient(160deg,#efe7d8,#cfc3ad)"],
  ["blank", "Your room", "linear-gradient(160deg,#2c2c30,#19191c)"],
];
const roomImg = $("#roomImg");
function setScene(id) {
  root.dataset.scene = id; store.set("scene", id);
  $$(".room-chip").forEach((c) => c.classList.toggle("active", c.dataset.room === id));
  roomImg.classList.remove("loaded");
  let src = `/web/rooms/${id}.jpg`;
  if (id === "blank") { const c = store.get("customBg"); if (!c) { roomImg.removeAttribute("src"); return; } src = c; }
  roomImg.onload = () => roomImg.classList.add("loaded");
  roomImg.onerror = () => roomImg.classList.remove("loaded");
  roomImg.src = src;
}
const roomGrid = $("#roomGrid");
ROOMS.forEach(([id, name, grad]) => {
  const b = document.createElement("button");
  b.className = "room-chip"; b.dataset.room = id; b.style.background = grad;
  b.innerHTML = `<span>${name}</span>`;
  b.addEventListener("click", () => setScene(id));
  roomGrid.appendChild(b);
});
setScene(store.get("scene", "library"));
$("#bgUpload").addEventListener("change", (e) => {
  const f = e.target.files[0]; if (!f) return;
  const r = new FileReader(); r.onload = () => { store.set("customBg", r.result); setScene("blank"); }; r.readAsDataURL(f);
});

/* scenes popover */
const pop = $("#scenesPop");
function togglePop(show) { pop.hidden = show === undefined ? !pop.hidden : !show; $('.dock-btn[data-pop="scenes"]').classList.toggle("on", !pop.hidden); }
$('.dock-btn[data-pop="scenes"]').addEventListener("click", () => togglePop());
document.addEventListener("click", (e) => { if (!pop.hidden && !pop.contains(e.target) && !e.target.closest('[data-pop="scenes"]')) togglePop(false); });

/* ---------- widgets: active set + chips + one-at-a-time expand ---------- */
const WIDGETS = ["clock", "timer", "life"];
let active = new Set(store.get("active", ["clock"]));
let expanded = null;
const rail = $("#rail"), stage = $("#stage");

function syncDock() { WIDGETS.forEach((n) => $(`.dock-btn[data-add="${n}"]`)?.classList.toggle("on", active.has(n))); }
function chipText(n) {
  if (n === "clock") return clockShort();
  if (n === "timer") return `<span class="dot ${pt.running ? "run" : ""}"></span>${fmt(pt.remaining)}`;
  if (n === "life") return lifeShort();
  return n;
}
function renderChips() {
  rail.innerHTML = "";
  for (const n of WIDGETS) {
    if (!active.has(n)) continue;
    const c = document.createElement("button");
    c.className = "chip"; c.dataset.chip = n; c.innerHTML = chipText(n);
    c.addEventListener("click", () => expand(n));
    rail.appendChild(c);
  }
}
function expand(n) {
  expanded = n; stage.hidden = false; wake();
  $$("#stage .panel").forEach((p) => (p.hidden = p.dataset.w !== n));
}
function collapse() { expanded = null; stage.hidden = true; }
$$("#stage [data-collapse]").forEach((b) => b.addEventListener("click", collapse));
stage.addEventListener("click", (e) => { if (e.target === stage) collapse(); });
document.addEventListener("keydown", (e) => { if (e.key === "Escape") { collapse(); $("#shelf").hidden || toggleShelf(false); } });

function toggleWidget(n) {
  if (active.has(n)) { active.delete(n); if (expanded === n) collapse(); }
  else { active.add(n); }
  store.set("active", [...active]); syncDock(); renderChips();
}
$$(".dock-btn[data-add]").forEach((b) => b.addEventListener("click", () => toggleWidget(b.dataset.add)));

/* ---------- ambient (auto-collapse + recede chrome while reading/idle) ---------- */
let idleT;
function wake() {
  body.classList.remove("ambient"); clearTimeout(idleT);
  idleT = setTimeout(() => { body.classList.add("ambient"); collapse(); }, 6000);
}
["pointermove", "pointerdown", "keydown", "wheel", "touchstart"].forEach((ev) =>
  window.addEventListener(ev, wake, { passive: true }));
wake();

/* ---------- clock ---------- */
const TZS = ["auto", "America/Los_Angeles", "America/New_York", "Europe/London", "Europe/Paris", "Asia/Kolkata", "Asia/Dubai", "Asia/Singapore", "Asia/Tokyo", "Australia/Sydney"];
const tzSel = $("#clockTz");
TZS.forEach((tz) => { const o = document.createElement("option"); o.value = tz; o.textContent = tz === "auto" ? "Auto (this device)" : tz.split("/").pop().replace(/_/g, " "); tzSel.appendChild(o); });
tzSel.value = store.get("tz", "auto");
tzSel.addEventListener("change", () => { store.set("tz", tzSel.value); tickClock(); });
const tz = () => (tzSel.value === "auto" ? undefined : tzSel.value);
function clockShort() { return new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: tz() }); }
function tickClock() {
  const now = new Date();
  $("#clockTime").textContent = now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit", timeZone: tz() });
  $("#clockDate").textContent = now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", timeZone: tz() });
}

/* ---------- pomodoro ---------- */
let pt = { min: 25, remaining: 25 * 60, running: false, id: null, mode: "focus" };
const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(Math.max(0, s) % 60).padStart(2, "0")}`;
function drawTimer() { $("#timerTime").textContent = fmt(pt.remaining); }
function setMode(min, mode) { pt.mode = mode; pt.min = min; pt.remaining = min * 60; pauseTimer(); drawTimer(); $$(".seg-btn").forEach((b) => b.classList.toggle("active", b.dataset.mode === mode)); }
function tickTimer() { if (pt.remaining <= 0) { pauseTimer(); return; } pt.remaining--; drawTimer(); }
function startTimer() { if (pt.running) return; pt.running = true; $("#timerToggle").textContent = "pause"; pt.id = setInterval(tickTimer, 1000); }
function pauseTimer() { pt.running = false; $("#timerToggle").textContent = "start"; clearInterval(pt.id); }
$("#timerToggle").addEventListener("click", () => (pt.running ? pauseTimer() : startTimer()));
$("#timerReset").addEventListener("click", () => { pt.remaining = pt.min * 60; pauseTimer(); drawTimer(); });
$$(".seg-btn").forEach((b) => b.addEventListener("click", () => setMode(+b.dataset.min, b.dataset.mode)));
drawTimer();

/* ---------- life ---------- */
const birthEl = $("#birth"), expEl = $("#expectancy");
birthEl.value = store.get("birth", ""); expEl.value = store.get("exp", 80);
function lifePctVal() {
  if (!birthEl.value) return null;
  const age = (Date.now() - new Date(birthEl.value)) / (365.25 * 864e5);
  return Math.min(100, (age / Math.max(40, +expEl.value || 80)) * 100);
}
function lifeShort() { const l = lifePctVal(); return l == null ? "set life" : `life ${l.toFixed(1)}%`; }
function drawLife() {
  const now = new Date();
  const yPct = ((now - new Date(now.getFullYear(), 0, 1)) / (new Date(now.getFullYear() + 1, 0, 1) - new Date(now.getFullYear(), 0, 1))) * 100;
  $("#yearPct").textContent = yPct.toFixed(1) + "%"; $("#yearBar").style.width = yPct + "%";
  const l = lifePctVal();
  if (l != null) { $("#lifePct").textContent = l.toFixed(1) + "%"; $("#lifeBar").style.width = l + "%"; }
  else { $("#lifePct").textContent = "—"; $("#lifeBar").style.width = "0%"; }
}
birthEl.addEventListener("change", () => { store.set("birth", birthEl.value); drawLife(); renderChips(); });
expEl.addEventListener("change", () => { store.set("exp", +expEl.value); drawLife(); renderChips(); });
drawLife();

/* ---------- ticker (chips + open panels stay live) ---------- */
setInterval(() => {
  tickClock();
  const cc = rail.querySelector('[data-chip="clock"]'); if (cc) cc.innerHTML = chipText("clock");
  const tc = rail.querySelector('[data-chip="timer"]'); if (tc) tc.innerHTML = chipText("timer");
}, 1000);
setInterval(drawLife, 60000);

/* ---------- library + reader ---------- */
let library = [], activeFile = null;
const listEl = $("#list");
function fmtViews(v) { const n = parseInt(v, 10); if (!n) return null; if (n >= 1e6) return (n / 1e6).toFixed(1) + "M views"; if (n >= 1e3) return (n / 1e3).toFixed(1) + "k views"; return n + " views"; }
function toggleShelf(force) { const sh = $("#shelf"); const show = force === undefined ? sh.hidden : force; sh.hidden = !show; $('.dock-btn[data-widget="library"]').classList.toggle("on", show); if (show) wake(); }
$('.dock-btn[data-widget="library"]').addEventListener("click", () => toggleShelf());
$("#shelfClose").addEventListener("click", () => toggleShelf(false));
$("#openShelf").addEventListener("click", () => toggleShelf(true));
function renderList() {
  const q = ($("#filter").value || "").toLowerCase().trim();
  const items = q ? library.filter((d) => (d.title + " " + d.channel).toLowerCase().includes(q)) : library;
  $("#shelfEmpty").hidden = library.length > 0; listEl.innerHTML = "";
  for (const d of items) {
    const li = document.createElement("li");
    const tag = d.transcript_kind && d.transcript_kind !== "none" ? `<span class="li-tag">${esc(d.transcript_kind)}</span>` : `<span class="li-tag none">no transcript</span>`;
    li.innerHTML = `<button class="list-item${d.file === activeFile ? " active" : ""}" type="button"><span class="li-title">${esc(d.title)}</span><span class="li-meta">${esc(d.channel || "—")} · ${tag}</span></button>`;
    li.querySelector("button").addEventListener("click", () => selectNote(d.file));
    listEl.appendChild(li);
  }
}
$("#filter").addEventListener("input", renderList);
function renderReader(d) {
  $("#readerEmpty").hidden = true; $("#readerBody").hidden = false;
  const meta = [];
  if (d.channel) meta.push(esc(d.channel));
  if (d.published && d.published !== "null") meta.push(esc(d.published));
  if (d.duration) meta.push(esc(d.duration));
  const v = fmtViews(d.views); if (v) meta.push(v);
  if (d.url) meta.push(`<a href="${esc(d.url)}" target="_blank" rel="noreferrer">Watch</a>`);
  const hasTr = d.transcript && d.transcript.trim();
  $("#readerBody").innerHTML =
    `<p class="doc-kicker">${hasTr ? "Transcript · " + esc(d.transcript_kind) : "Metadata only"}</p>
     <h1 class="doc-title">${esc(d.title)}</h1>
     <div class="doc-meta">${meta.join("<span>·</span>")}</div>
     <div class="doc-actions">
       <a class="ghost-btn" href="/api/download/${encodeURIComponent(d.file)}" download>Download .md</a>
       <button class="ghost-btn" data-act="ai">Copy for AI</button>
       <button class="ghost-btn" data-act="tr">Copy transcript</button>
     </div>` +
    (d.description ? `<p class="doc-label">Description</p><div class="doc-desc">${esc(d.description)}</div>` : "") +
    `<p class="doc-label">Transcript</p>` +
    (hasTr ? `<div class="doc-transcript">${esc(d.transcript)}</div>` : `<div class="doc-transcript empty">No captions were available.</div>`);
  const cp = async (t, b) => { try { await navigator.clipboard.writeText(t); const o = b.textContent; b.textContent = "Copied"; setTimeout(() => (b.textContent = o), 1400); } catch {} };
  $("#readerBody").querySelector('[data-act="tr"]').addEventListener("click", (e) => cp(d.transcript || "", e.target));
  $("#readerBody").querySelector('[data-act="ai"]').addEventListener("click", (e) => cp(`Title: ${d.title}\nChannel: ${d.channel}\nURL: ${d.url}\n\n${d.transcript ? "Transcript:\n" + d.transcript : "(no transcript)"}`, e.target));
  $("#reader").scrollTop = 0;
}
async function selectNote(file) {
  activeFile = file; renderList(); toggleShelf(false); collapse();
  try { const r = await fetch(`/api/note/${encodeURIComponent(file)}`); if (!r.ok) throw 0; renderReader(await r.json()); }
  catch { $("#readerBody").hidden = true; $("#readerEmpty").hidden = false; }
}
async function loadLibrary() {
  try { library = await (await fetch("/api/library")).json(); renderList(); } catch {}
  const open = new URLSearchParams(location.search).get("open");
  if (open && library.some((d) => d.file === open)) selectNote(open);
  else if (library.length === 0) toggleShelf(true);
}

/* init */
syncDock(); renderChips(); loadLibrary();
