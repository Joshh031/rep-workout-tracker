// Diagnostic endpoint: reports which env vars the deployment actually sees
// and live-tests the database connection with the exact same headers the
// data proxy uses. Reveals no secret values — only presence, key type, and
// the (already-public) project URL. Safe to open in a browser:
//   https://<app>/api/health

import { supabaseConfig, supabaseHeaders } from "./_supabase.js";

const EXPECTED_REF = "aeennjelfkvrzmzhbpnp"; // the "rep" project that holds the app's data

export default async function handler(req, res) {
  const { url, key } = supabaseConfig();
  const ref = url.match(/^https:\/\/([a-z0-9]+)\./)?.[1] || "unknown";

  const keyType = !key ? "MISSING"
    : key.startsWith("sb_secret_") ? "sb_secret (correct)"
    : key.startsWith("sb_publishable_") ? "sb_publishable (WRONG — this is the public key; use the SECRET key)"
    : key.startsWith("eyJ") ? "legacy JWT"
    : "unrecognized format";

  const out = {
    appSecretSet: !!process.env.APP_SECRET,
    ouraTokenSet: !!process.env.OURA_TOKEN,
    anthropicKeySet: !!(process.env.ANTHROPIC_API_KEY || process.env.VITE_ANTHROPIC_KEY),
    supabaseUrl: url || "MISSING",
    projectRef: ref,
    pointsAtRepProject: ref === EXPECTED_REF,
    serviceKeyType: keyType,
    serviceKeySource: process.env.SUPABASE_SERVICE_KEY ? "SUPABASE_SERVICE_KEY"
      : process.env.VITE_SUPABASE_KEY ? "VITE_SUPABASE_KEY (FALLBACK — the SUPABASE_SERVICE_KEY var is not visible to this deployment)"
      : "NONE",
  };

  if (url && key) {
    try {
      const r = await fetch(`${url}/rest/v1/workouts?limit=1`, { headers: supabaseHeaders(key) });
      const text = await r.text();
      let rows;
      try { rows = JSON.parse(text); } catch { rows = null; }
      out.dbTest = {
        status: r.status,
        ok: r.ok,
        rowsVisible: r.ok && Array.isArray(rows) ? rows.length > 0 : undefined,
        error: r.ok ? undefined : text.slice(0, 300),
      };
    } catch (e) {
      out.dbTest = { error: String(e.message || e) };
    }
  } else {
    out.dbTest = { error: "Supabase URL or key missing — no test run" };
  }

  res.setHeader("Cache-Control", "no-store");
  return res.status(200).json(out);
}
