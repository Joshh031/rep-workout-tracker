// Supabase proxy: the browser never talks to Supabase directly and never
// holds a database key. Requires the x-app-secret header (see _auth.js).
//
// GET    /api/data?table=X&user_id=eq.Y&order=created_at.desc  -> rows
// POST   /api/data?table=X          body: {user_id, data} or an array (bulk)
// PATCH  /api/data?table=X&user_id=eq.Y&data->>id=eq.Z  body: {data}
// DELETE /api/data?table=X&user_id=eq.Y&data->>id=eq.Z
//
// Uses SUPABASE_SERVICE_KEY (service_role — bypasses RLS) so RLS can be
// enabled on the tables with no public policies, which is what locks out
// direct anon-key access.

import { checkAuth } from "./_auth.js";
import { supabaseConfig, supabaseHeaders } from "./_supabase.js";

const TABLES = new Set(["workouts", "daily_logs", "sleep_logs"]);
// Only these PostgREST query params may pass through
const PARAMS = ["user_id", "data->>id", "order", "limit"];
const METHODS = new Set(["GET", "POST", "PATCH", "DELETE"]);

export default async function handler(req, res) {
  if (!checkAuth(req, res)) return;

  const { url: base, key } = supabaseConfig();
  if (!base || !key) {
    return res.status(500).json({ error: "Supabase env vars not configured" });
  }
  if (!METHODS.has(req.method)) {
    return res.status(405).json({ error: "Method not allowed" });
  }
  const table = req.query.table;
  if (!TABLES.has(table)) {
    return res.status(400).json({ error: "Unknown table" });
  }

  const qs = new URLSearchParams();
  for (const p of PARAMS) {
    if (req.query[p] != null) qs.set(p, req.query[p]);
  }
  const suffix = qs.toString();
  const target = `${base}/rest/v1/${table}${suffix ? "?" + suffix : ""}`;

  const r = await fetch(target, {
    method: req.method,
    headers: {
      ...supabaseHeaders(key),
      Prefer: req.method === "POST" ? "return=representation" : "return=minimal",
    },
    body: req.method === "POST" || req.method === "PATCH" ? JSON.stringify(req.body) : undefined,
  });

  const text = await r.text();
  res.status(r.status);
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", "no-store");
  return res.send(text || (req.method === "GET" ? "[]" : "{}"));
}
