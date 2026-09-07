// Export the user's workout history for outside analysis. Requires the
// passphrase like every other route (header or ?s=, so a tool can fetch it
// from a link — the History tab's COPY LINK button produces that link).
//
// GET /api/export?format=csv          -> one row per set (strength sessions only)
// GET /api/export?format=json         -> every session, incl. runs and timing
// Optional: &download=1               -> serve as an attachment instead of inline text
//           &user_id=...              -> otherwise every row in the table (single-user app)

import { checkAuth } from "./_auth.js";
import { supabaseConfig, supabaseHeaders } from "./_supabase.js";
import { buildExport } from "../src/export.js";

const PAGE = 1000; // PostgREST's default max-rows

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
    const { text, filename, mime } = buildExport(rows.map(r => r.data).filter(Boolean), format);
    res.status(200);
    res.setHeader("Cache-Control", "no-store");
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
