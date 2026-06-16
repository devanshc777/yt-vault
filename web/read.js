"use strict";
const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);
const root = document.documentElement;
const store = {
  get: (k, d) => { try { return JSON.parse(localStorage.getItem("ytv-" + k)) ?? d; } catch { return d; } },
  set: (k, v) => localStorage.setItem("ytv-" + k, JSON.stringify(v)),
};
const esc = (s) => (s ?? "").toString().replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/* ---------- theme ---------- */
const savedTheme = localStorage.getItem("ytv-theme");
if (savedTheme) root.dataset.theme = savedTheme;
$("#themeToggle").addEventListener("click", () => {
  const n = root.dataset.theme === "light" ? "dark" : "light";
  root.dataset.theme = n; localStorage.setItem("ytv-theme", n);
});

/* ---------- scenes ---------- */
const SCENES = [
  ["lamplit", "Lamplit", "radial-gradient(circle at 50% 0,#caa05a,#2a2018)"],
  ["paper", "Paper", "linear-gradient(160deg,#f3ede1,#ddd3c0)"],
  ["rain", "Rain", "linear-gradient(160deg,#3a4a63,#202b3d)"],
  ["library", "Library", "linear-gradient(160deg,#6b4f2e,#2a1d12)"],
  ["dusk", "Dusk", "linear-gradient(160deg,#5b4b8a,#c06a4a)"],
  ["forest", "Forest", "linear-gradient(160deg,#2f5e44,#16241c)"],
  ["blank", "Blank", "linear-gradient(160deg,#2a2a2e,#1a1a1d)"],
];
const sceneGrid = $("#sceneGrid");
SCENES.forEach(([id, name, css]) => {
  const b = document.createElement("button");
  b.className = "scene-chip"; b.style.background = css; b.dataset.scene = id;
  b.innerHTML = `<span>${name}</span>`;
  b.addEventListener("click", () => setScene(id));
  sceneGrid.appendChild(b);
});
function setScene(id) {
  root.dataset.scene = id; store.set("scene", id);
  $$(".scene-chip").forEach((c) => c.classList.toggle("active", c.dataset.scene === id));
  const bg = $("#customBg");
  if (id === "blank" && store.get("customBg")) { bg.src = store.get("customBg"); bg.hidden = false; }
  else { bg.hidden = true; }
}
setScene(store.get("scene", "lamplit"));

$("#bgUpload").addEventListener("change", (e) => {
  const f = e.target.files[0]; if (!f) return;
  const r = new FileReader();
  r.onload = () => { store.set("customBg", r.result); setScene("blank"); };
  r.readAsDataURL(f);
});

/* ---------- popover + dock ---------- */
const scenesPop = $("#scenesPop");
function togglePop(show) {
  scenesPop.hidden = show === undefined ? !scenesPop.hidden : !show;
  $('.dock-btn[data-pop="scenes"]').classList.toggle("active", !scenesPop.hidden);
}
$('.dock-btn[data-pop="scenes"]').addEventListener("click", () => togglePop());
document.addEventListener("click", (e) => {
  if (!scenesPop.hidden && !scenesPop.contains(e.target) && !e.target.closest('[data-pop="scenes"]')) togglePop(false);
});

/* ---------- widgets: toggle + drag + persist ---------- */
const DEFAULT_POS = {
  clock: { right: 24, top: 92 }, timer: { right: 24, top: 300 }, life: { right: 24, bottom: 28 },
};
function widgetEl(name) { return $(`#w-${name}`); }
function setWidget(name, show) {
  const el = widgetEl(name); if (!el) return;
  el.hidden = !show;
  $(`.dock-btn[data-widget="${name}"]`)?.classList.toggle("active", show && name !== "library");
  const vis = store.get("widgets", {}); vis[name] = show; store.set("widgets", vis);
  if (show && el.dataset.placed !== "1") placeWidget(name);
}
function placeWidget(name) {
  const el = widgetEl(name); const saved = store.get("pos-" + name);
  el.style.left = el.style.right = el.style.top = el.style.bottom = "";
  if (saved) { el.style.left = saved.x + "px"; el.style.top = saved.y + "px"; }
  else { Object.assign(el.style, Object.fromEntries(Object.entries(DEFAULT_POS[name]).map(([k, v]) => [k, v + "px"]))); }
  el.dataset.placed = "1";
}
$$(".widget").forEach((el) => {
  const grip = el.querySelector("[data-grip]"); if (!grip) return;
  let sx, sy, ox, oy, dragging = false;
  grip.addEventListener("pointerdown", (e) => {
    dragging = true; grip.setPointerCapture(e.pointerId);
    const r = el.getBoundingClientRect();
    el.style.left = r.left + "px"; el.style.top = r.top + "px"; el.style.right = el.style.bottom = "";
    sx = e.clientX; sy = e.clientY; ox = r.left; oy = r.top;
  });
  grip.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    const x = Math.max(4, Math.min(innerWidth - el.offsetWidth - 4, ox + e.clientX - sx));
    const y = Math.max(4, Math.min(innerHeight - 40, oy + e.clientY - sy));
    el.style.left = x + "px"; el.style.top = y + "px";
  });
  grip.addEventListener("pointerup", () => {
    if (!dragging) return; dragging = false;
    store.set("pos-" + el.dataset.w, { x: parseFloat(el.style.left), y: parseFloat(el.style.top) });
  });
});

/* dock widget buttons */
$$(".dock-btn[data-widget]").forEach((btn) => {
  const name = btn.dataset.widget;
  btn.addEventListener("click", () => {
    if (name === "library") { toggleShelf(); return; }
    setWidget(name, widgetEl(name).hidden);
  });
});

/* ---------- clock ---------- */
const TZS = ["auto", "America/Los_Angeles", "America/New_York", "Europe/London", "Europe/Paris",
  "Asia/Kolkata", "Asia/Dubai", "Asia/Singapore", "Asia/Tokyo", "Australia/Sydney"];
const tzSel = $("#clockTz");
TZS.forEach((tz) => { const o = document.createElement("option"); o.value = tz; o.textContent = tz === "auto" ? "Auto (this device)" : tz.split("/").pop().replace(/_/g, " "); tzSel.appendChild(o); });
tzSel.value = store.get("tz", "auto");
tzSel.addEventListener("change", () => { store.set("tz", tzSel.value); tickClock(); });
function tickClock() {
  const tz = tzSel.value === "auto" ? undefined : tzSel.value;
  const now = new Date();
  $("#clockTime").textContent = now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit", timeZone: tz });
  $("#clockDate").textContent = now.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric", timeZone: tz });
}
setInterval(tickClock, 1000); tickClock();

/* ---------- pomodoro ---------- */
let pt = { min: 25, remaining: 25 * 60, running: false, id: null, mode: "focus" };
const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
function drawTimer() { $("#timerTime").textContent = fmt(pt.remaining); }
function setMode(min, mode) {
  pt.mode = mode; pt.min = min; pt.remaining = min * 60; pauseTimer(); drawTimer();
  $$(".timer-modes .chip").forEach((c) => c.classList.toggle("active", c.dataset.mode === mode));
}
function tickTimer() {
  if (pt.remaining <= 0) { pauseTimer(); widgetEl("timer").animate([{ filter: "brightness(1.6)" }, { filter: "none" }], { duration: 800, iterations: 3 }); return; }
  pt.remaining--; drawTimer();
}
function startTimer() { if (pt.running) return; pt.running = true; $("#timerToggle").textContent = "Pause"; pt.id = setInterval(tickTimer, 1000); }
function pauseTimer() { pt.running = false; $("#timerToggle").textContent = "Start"; clearInterval(pt.id); }
$("#timerToggle").addEventListener("click", () => (pt.running ? pauseTimer() : startTimer()));
$("#timerReset").addEventListener("click", () => { pt.remaining = pt.min * 60; pauseTimer(); drawTimer(); });
$$(".timer-modes .chip").forEach((c) => c.addEventListener("click", () => setMode(+c.dataset.min, c.dataset.mode)));
drawTimer();

/* ---------- life ---------- */
const birthEl = $("#birth"), expEl = $("#expectancy");
birthEl.value = store.get("birth", ""); expEl.value = store.get("exp", 80);
function drawLife() {
  const now = new Date();
  const yStart = new Date(now.getFullYear(), 0, 1), yEnd = new Date(now.getFullYear() + 1, 0, 1);
  const yPct = ((now - yStart) / (yEnd - yStart)) * 100;
  $("#yearPct").textContent = yPct.toFixed(1) + "%"; $("#yearBar").style.width = yPct + "%";
  if (birthEl.value) {
    const b = new Date(birthEl.value); const age = (now - b) / (365.25 * 864e5);
    const exp = Math.max(40, +expEl.value || 80); const lPct = Math.min(100, (age / exp) * 100);
    $("#lifePct").textContent = lPct.toFixed(1) + "%"; $("#lifeBar").style.width = lPct + "%";
  } else { $("#lifePct").textContent = "set date"; $("#lifeBar").style.width = "0%"; }
}
birthEl.addEventListener("change", () => { store.set("birth", birthEl.value); drawLife(); });
expEl.addEventListener("change", () => { store.set("exp", +expEl.value); drawLife(); });
drawLife(); setInterval(drawLife, 60000);

/* ---------- library + reader ---------- */
let library = [], activeFile = null;
const listEl = $("#list");
function fmtViews(v) { const n = parseInt(v, 10); if (!n) return null; if (n >= 1e6) return (n / 1e6).toFixed(1) + "M views"; if (n >= 1e3) return (n / 1e3).toFixed(1) + "k views"; return n + " views"; }

function toggleShelf(force) {
  const sh = $("#shelf"); const show = force === undefined ? sh.hidden : force;
  sh.hidden = !show; $('.dock-btn[data-widget="library"]').classList.toggle("active", show);
}
$("#shelfClose").addEventListener("click", () => toggleShelf(false));
$("#openShelf").addEventListener("click", () => toggleShelf(true));

function renderList() {
  const q = ($("#filter").value || "").toLowerCase().trim();
  const items = q ? library.filter((d) => (d.title + " " + d.channel).toLowerCase().includes(q)) : library;
  $("#shelfEmpty").hidden = library.length > 0;
  listEl.innerHTML = "";
  for (const d of items) {
    const li = document.createElement("li");
    const tag = d.transcript_kind && d.transcript_kind !== "none"
      ? `<span class="li-tag">${esc(d.transcript_kind)}</span>` : `<span class="li-tag none">no transcript</span>`;
    li.innerHTML = `<button class="list-item${d.file === activeFile ? " active" : ""}" type="button">
      <span class="li-title">${esc(d.title)}</span><span class="li-meta">${esc(d.channel || "—")} · ${tag}</span></button>`;
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
     <div class="doc-meta">${meta.join('<span>·</span>')}</div>
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
  $("#readerBody").querySelector('[data-act="ai"]').addEventListener("click", (e) =>
    cp(`Title: ${d.title}\nChannel: ${d.channel}\nURL: ${d.url}\n\n${d.transcript ? "Transcript:\n" + d.transcript : "(no transcript)"}`, e.target));
  $("#reader").scrollTop = 0;
}

async function selectNote(file) {
  activeFile = file; renderList();
  if (window.matchMedia("(max-width: 760px)").matches) toggleShelf(false);
  try {
    const r = await fetch(`/api/note/${encodeURIComponent(file)}`);
    if (!r.ok) throw 0; renderReader(await r.json());
  } catch { $("#readerBody").hidden = true; $("#readerEmpty").hidden = false; }
}

async function loadLibrary() {
  try { library = await (await fetch("/api/library")).json(); renderList(); } catch {}
  const open = new URLSearchParams(location.search).get("open");
  if (open && library.some((d) => d.file === open)) selectNote(open);
  else if (library.length === 0) toggleShelf(true);
}

/* ---------- restore widget visibility ---------- */
const vis = store.get("widgets", { clock: true });
["clock", "timer", "life"].forEach((n) => { if (vis[n]) setWidget(n, true); });
loadLibrary();
