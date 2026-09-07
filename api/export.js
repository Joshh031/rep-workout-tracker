// Export the user's workout history for outside analysis. Requires the
// passphrase like every other route (header or ?s=, so a tool can fetch it
// from a link — the History tab's COPY LINK button produces that link).
//
// GET /api/export?format=csv          -> one row per set (strength sessions only)
// GET /api/export?format=json         -> every session, incl. runs and timing
// Optional: &download=1               -> serve as an attachment instead of inline text
//           &raw=1                    -> plain text even in a browser (default for non-browser clients)
//           &user_id=...              -> otherwise every row in the table (single-user app)

import { checkAuth } from "./_auth.js";
import { supabaseConfig, supabaseHeaders } from "./_supabase.js";
import { buildExport } from "../src/export.js";

const PAGE = 1000; // PostgREST's default max-rows

const escapeHtml = (t) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;");
// Data goes into the page as a JS string, not into the DOM: a textarea with
// thousands of rows is what made the old page crawl on a phone.
const jsString = (t) => JSON.stringify(t).replace(/<\//g, "<\\/");

// When a browser (Accept: text/html) opens the link it gets a light page:
// a short preview plus SAVE FILE (share sheet → Save to Files / AirDrop),
// COPY ALL (clipboard) and DOWNLOAD. Tools that fetch the link (curl,
// requests, an LLM app) send */* and get the raw text.
const htmlPage = ({ text, filename, mime, count, unit }, downloadUrl) => {
  const lines = text.split("\n");
  const preview = lines.slice(0, 12).join("\n");
  const more = Math.max(0, lines.length - 13);
  return `<!doctype html>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${filename}</title>
<style>
  body{margin:0;background:#0d0d0d;color:#ddd;font:13px ui-monospace,Menlo,monospace;padding:16px}
  h1{font-size:12px;letter-spacing:2px;color:#ff4d00;margin:0 0 4px}
  .meta{font-size:11px;color:#888;margin-bottom:12px}
  .row{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px}
  button,a.btn{background:#1a1a1a;color:#ddd;border:1px solid #333;border-radius:8px;padding:12px 16px;font:inherit;font-size:12px;text-decoration:none;cursor:pointer}
  button.primary{background:#ff4d00;color:#000;border-color:#ff4d00;font-weight:600}
  #msg{font-size:11px;color:#3a9e4f;min-height:16px;margin-bottom:8px}
  pre{background:#111;color:#999;border:1px solid #222;border-radius:8px;padding:10px;font-size:11px;overflow:auto;margin:0}
  .more{font-size:11px;color:#666;margin-top:6px}
</style>
<h1>REP EXPORT</h1>
<div class="meta">${filename} · ${count} ${unit}</div>
<div class="row">
  <button id="save" class="primary">⇡ SAVE FILE</button>
  <button id="copy">⎘ COPY ALL</button>
  <a class="btn" id="dl" href="${downloadUrl}">⇣ DOWNLOAD</a>
</div>
<div id="msg"></div>
<pre>${escapeHtml(preview)}</pre>
${more ? `<div class="more">… ${more} more rows in the file</div>` : ""}
<script>
  const DATA = ${jsString(text)}, NAME = ${jsString(filename)}, MIME = ${jsString(mime)};
  const msg = document.getElementById("msg"), say = (t) => { msg.textContent = t; };
  const file = () => new File([DATA], NAME, { type: MIME });
  const save = document.getElementById("save");
  if (!(navigator.canShare && navigator.canShare({ files: [file()] }))) {
    // No share sheet here (desktop browser): SAVE FILE just downloads
    save.onclick = () => { document.getElementById("dl").click(); };
  } else {
    save.onclick = () => {
      navigator.share({ files: [file()], title: NAME })
        .then(() => say("✓ saved — pick Save to Files, AirDrop, or an app in the sheet"))
        .catch(e => { if (e.name !== "AbortError") say("✗ " + e.message); });
    };
  }
  document.getElementById("copy").onclick = () => {
    const done = () => say("✓ copied ${count} ${unit} — paste into your analysis tool");
    const fallback = () => {
      const ta = document.createElement("textarea"); ta.value = DATA; document.body.appendChild(ta);
      ta.select(); ta.setSelectionRange(0, DATA.length);
      const ok = document.execCommand("copy"); ta.remove();
      ok ? done() : say("✗ copy blocked by the browser — use SAVE FILE instead");
    };
    navigator.clipboard?.writeText ? navigator.clipboard.writeText(DATA).then(done, fallback) : fallback();
  };
</script>
`;
};

export default async function handler(req, res) {
  if (!checkAuth(req, res)) return;
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  const { url: base, key } = supabaseConfig();
  if (!base || !key) return res.status(500).json({ error: "Supabase env vars not configured" });

  const q = req.query || {};
  const format = q.format === "json" ? "json" : "csv";
  const filter = q.user_id ? `&user_id=eq.${encodeURIComponent(q.user_id)}` : "";

  try {
    const rows = [];
    for (let from = 0; ; from += PAGE) {
      const r = await fetch(`${base}/rest/v1/workouts?select=data&order=created_at.asc${filter}`, {
        headers: { ...supabaseHeaders(key), Range: `${from}-${from + PAGE - 1}` },
      });
      if (!r.ok && r.status !== 206) throw new Error(`Supabase read failed (${r.status})`);
      const page = await r.json();
      rows.push(...page);
      if (page.length < PAGE) break;
    }
    const built = buildExport(rows.map(r => r.data).filter(Boolean), format);
    const { text, filename, mime } = built;
    res.status(200);
    res.setHeader("Cache-Control", "no-store");
    const wantsHtml = !q.raw && !q.download && /text\/html/.test(req.headers?.accept || "");
    if (wantsHtml) {
      const params = new URLSearchParams({ format, download: "1", ...(q.s ? { s: q.s } : {}), ...(q.user_id ? { user_id: q.user_id } : {}) });
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      return res.send(htmlPage(built, `/api/export?${params}`));
    }
    if (q.download) {
      res.setHeader("Content-Type", mime + "; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    } else {
      // Inline plain text renders in a phone browser instead of a blank tab
      res.setHeader("Content-Type", (format === "json" ? "application/json" : "text/plain") + "; charset=utf-8");
    }
    return res.send(text);
  } catch (e) {
    return res.status(502).json({ error: String(e.message || e) });
  }
}
