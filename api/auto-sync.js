// Daily server-side Oura ingestion: pulls the last week of sleep nights and
// step counts and writes them straight to Supabase, so recording no longer
// depends on opening the app. Triggered by a Vercel cron; idempotent — safe
// to call anytime (creates missing days, fills blanks only, never overwrites).

import { supabaseConfig, supabaseHeaders } from "./_supabase.js";
import { isoDaysAgo, fetchAll, fetchNights, displayDate, nightToStrings, SLEEP_FIELDS, jhSpreadOf } from "./_oura.js";

export default async function handler(req, res) {
  // Vercel cron sends CRON_SECRET as a Bearer token when the env var is set
  if (process.env.CRON_SECRET && req.headers?.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const token = process.env.OURA_TOKEN;
  const { url: base, key } = supabaseConfig();
  if (!token || !base || !key) {
    return res.status(500).json({ error: "OURA_TOKEN / Supabase env vars missing" });
  }

  const sbGet = async (path) => {
    const r = await fetch(`${base}/rest/v1/${path}`, { headers: supabaseHeaders(key) });
    if (!r.ok) throw new Error(`Supabase GET ${path.split("?")[0]} failed (${r.status})`);
    return r.json();
  };
  const sbWrite = async (path, method, body) => {
    const r = await fetch(`${base}/rest/v1/${path}`, {
      method,
      headers: { ...supabaseHeaders(key), Prefer: "return=minimal" },
      body: JSON.stringify(body),
    });
    if (!r.ok) throw new Error(`Supabase ${method} ${path.split("?")[0]} failed (${r.status})`);
  };
  // Newest row per stored date for a table
  const rowsByDate = async (table, uidQ) => {
    const rows = await sbGet(`${table}?user_id=eq.${uidQ}&select=data&order=created_at.desc`);
    const m = new Map();
    rows.forEach(r => { if (r.data?.date && !m.has(r.data.date)) m.set(r.data.date, r.data); });
    return m;
  };

  try {
    // Resolve the app's user id from the newest existing row
    const probe = await sbGet("sleep_logs?select=user_id&order=created_at.desc&limit=1");
    const uid = probe[0]?.user_id
      || (await sbGet("daily_logs?select=user_id&order=created_at.desc&limit=1"))[0]?.user_id;
    if (!uid) return res.status(200).json({ skipped: "no existing rows to resolve user id" });
    const uidQ = encodeURIComponent(uid);

    const end = new Date().toISOString().slice(0, 10);
    const start = isoDaysAgo(7, end);
    const idBase = Date.now();
    let i = 0;

    // ── Sleep: create missing nights, fill blanks on partial ones ──
    const { nights } = await fetchNights(token, start, end);
    const sleepByDate = await rowsByDate("sleep_logs", uidQ);
    let sleepAdded = 0, sleepRepaired = 0;
    for (const n of nights) {
      const fresh = nightToStrings(n);
      const date = displayDate(n.day);
      const existing = sleepByDate.get(date);
      if (!existing) {
        await sbWrite("sleep_logs", "POST", {
          user_id: uid,
          data: { id: idBase + i++, date, ...fresh, jhSpread: jhSpreadOf(fresh.hrv, fresh.heartRate) },
        });
        sleepAdded++;
      } else {
        const merged = { ...existing };
        let changed = false;
        for (const k of SLEEP_FIELDS) {
          if (!existing[k] && fresh[k]) { merged[k] = fresh[k]; changed = true; }
        }
        if (changed) {
          merged.jhSpread = jhSpreadOf(merged.hrv, merged.heartRate) ?? merged.jhSpread ?? null;
          await sbWrite(`sleep_logs?user_id=eq.${uidQ}&data->>id=eq.${merged.id}`, "PATCH", { data: merged });
          sleepRepaired++;
        }
      }
    }

    // ── Steps: yesterday and earlier only (today's count is still growing) ──
    const acts = await fetchAll(token, "daily_activity", start, end);
    const dailyByDate = await rowsByDate("daily_logs", uidQ);
    let stepsAdded = 0, stepsFilled = 0;
    for (const a of acts) {
      if (a.steps == null || a.day === end) continue;
      const date = displayDate(a.day);
      const existing = dailyByDate.get(date);
      if (!existing) {
        await sbWrite("daily_logs", "POST", {
          user_id: uid,
          data: { id: idBase + i++, date, crunches: "", planks: "", pushups: "", steps: String(a.steps), stretches: [], breathing: "", breathProtocol: "", breathSeconds: "" },
        });
        stepsAdded++;
      } else if (!existing.steps) {
        await sbWrite(`daily_logs?user_id=eq.${uidQ}&data->>id=eq.${existing.id}`, "PATCH", { data: { ...existing, steps: String(a.steps) } });
        stepsFilled++;
      }
    }

    res.setHeader("Cache-Control", "no-store");
    return res.status(200).json({ range: { start, end }, nightsFromOura: nights.length, sleepAdded, sleepRepaired, stepsAdded, stepsFilled });
  } catch (e) {
    return res.status(502).json({ error: String(e.message || e) });
  }
}
