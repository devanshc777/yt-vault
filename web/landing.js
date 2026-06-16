"use strict";
const $ = (s) => document.querySelector(s);

/* theme (shared key with reading room) */
const root = document.documentElement;
const saved = localStorage.getItem("ytv-theme");
if (saved) root.dataset.theme = saved;
$("#themeToggle").addEventListener("click", () => {
  const next = root.dataset.theme === "light" ? "dark" : "light";
  root.dataset.theme = next;
  localStorage.setItem("ytv-theme", next);
});

const esc = (s) => (s ?? "").toString()
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const setStatus = (m, k = "") => { const e = $("#status"); e.textContent = m || ""; e.className = "status" + (k ? " " + k : ""); };

function fmtViews(v) {
  const n = parseInt(v, 10); if (!n) return null;
  if (n >= 1e6) return (n / 1e6).toFixed(1) + "M views";
  if (n >= 1e3) return (n / 1e3).toFixed(1) + "k views";
  return n + " views";
}

function showResult(d) {
  $("#rKicker").textContent = d.transcript ? `Transcript · ${d.transcript_kind}` : "Metadata only";
  $("#rTitle").textContent = d.title;
  const meta = [d.channel, d.published !== "null" ? d.published : null, d.duration, fmtViews(d.views)].filter(Boolean);
  $("#rMeta").textContent = meta.join("  ·  ");
  const prev = d.transcript ? d.transcript.slice(0, 600) : "No captions were available for this video.";
  $("#rPreview").textContent = prev;
  $("#rDownload").href = `/api/download/${encodeURIComponent(d.file)}`;
  $("#rOpen").href = `/read?open=${encodeURIComponent(d.file)}`;
  $("#rCopy").onclick = async (e) => {
    const block = `Title: ${d.title}\nChannel: ${d.channel}\nURL: ${d.url}\n\n` +
      (d.transcript ? `Transcript:\n${d.transcript}` : "(no transcript available)");
    try { await navigator.clipboard.writeText(block); e.target.textContent = "Copied"; setTimeout(() => (e.target.textContent = "Copy for AI"), 1400); }
    catch { setStatus("Couldn't copy.", "error"); }
  };
  const r = $("#result"); r.hidden = false;
  r.scrollIntoView({ behavior: "smooth", block: "center" });
}

/* optional: use a generated hero image if one exists at web/assets/orb.* */
(function loadOrb() {
  const orb = $("#orb"), img = $("#orbImg");
  const tries = ["/web/assets/orb.png", "/web/assets/orb.webp", "/web/assets/orb.jpg"];
  let i = 0;
  const next = () => { if (i >= tries.length) return; img.onload = () => orb.classList.add("has-img"); img.onerror = () => { i++; next(); }; img.src = tries[i]; };
  next();
})();

$("#fetchForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const url = $("#urlInput").value.trim(); if (!url) return;
  const btn = $("#fetchBtn"); btn.disabled = true; btn.textContent = "Fetching…";
  setStatus("Pulling metadata and captions… this can take a few seconds.");
  try {
    const r = await fetch("/api/fetch", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url }) });
    const data = await r.json();
    if (!r.ok) throw new Error(data.detail || "fetch failed");
    showResult(data);
    setStatus(data.transcript ? "Saved to your vault." : "Saved (no captions on this one).", "ok");
    $("#urlInput").value = "";
  } catch (err) {
    setStatus(String(err.message || err).replace(/^Error:\s*/, ""), "error");
  } finally {
    btn.disabled = false; btn.textContent = "Get transcript";
  }
});
