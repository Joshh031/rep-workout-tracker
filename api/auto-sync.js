// Daily server-side Oura ingestion: pulls the last week of sleep nights and
// step counts and writes them straight to Supabase, so recording no longer
// depends on opening the app. Triggered by a Vercel cron; idempotent — safe
// to call anytime (creates missing days, fills blanks only, never overwrites).

import { supabaseConfig, supabaseHeaders } from "./_supabase.js";

const OURA = "https://api.ouraring.com/v2/usercollection";

const hmm = (sec) => {
  if (!sec && sec !== 0) return "";
  const h = Math.floor(sec / 3600);
  const m = Math.round((sec % 3600) / 60);
  return `${h}:${String(m).padStart(2, "0")}`;
};
const clockOf = (iso) => (typeof iso === "string" && (iso.match(/T(\d{2}:\d{2})/) || [])[1]) || "";
// "2026-08-20" -> "8/20/2026" (the app's stored date format)
const display = (day) => { const [y, m, d] = day.split("-"); return `${+m}/${+d}/${y}`; };
const str = (v) => v != null ? String(v) : "";

export default async function handler(req, res) {
  // Vercel cron sends CRON_SECRET as a Bearer token when the env var is set
  if (process.env.CRON_SECRET && req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
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
  const oura = async (path, start, end) => {
    const out = [];
    let pageToken = null;
    do {
      const u = `${OURA}/${path}?start_date=${start}&end_date=${end}` +
        (pageToken ? `&next_token=${encodeURIComponent(pageToken)}` : "");
      const r = await fetch(u, { headers: { Authorization: `Bearer ${token}` } });
      if (!r.ok) throw new Error(`Oura ${path} failed (${r.status})`);
      const j = await r.json();
      out.push(...(j.data || []));
      pageToken = j.next_token || null;
    } while (pageToken);
    return out;
  };

  try {
    // Resolve the app's user id from the newest existing row
    const probe = await sbGet("sleep_logs?select=user_id&order=created_at.desc&limit=1");
    const uid = probe[0]?.user_id
      || (await sbGet("daily_logs?select=user_id&order=created_at.desc&limit=1"))[0]?.user_id;
    if (!uid) return res.status(200).json({ skipped: "no existing rows to resolve user id" });
    const uidQ = encodeURIComponent(uid);

    const end = new Date().toISOString().slice(0, 10);
    const startD = new Date(end + "T12:00:00Z");
    startD.setUTCDate(startD.getUTCDate() - 7);
    const start = startD.toISOString().slice(0, 10);

    // ── Sleep: create missing nights, fill blanks on partial ones ──
    const [ds, dr, sp] = await Promise.all([
      oura("daily_sleep", start, end),
      oura("daily_readiness", start, end),
      oura("sleep", start, end),
    ]);
    const days = {};
    ds.forEach(d => { (days[d.day] ||= {}).ds = d; });
    dr.forEach(d => { (days[d.day] ||= {}).dr = d; });
    sp.forEach(p => {
      const o = days[p.day] ||= {};
      const better = p.type === "long_sleep"
        ? (o.period?.type !== "long_sleep" || (p.total_sleep_duration || 0) > (o.period.total_sleep_duration || 0))
        : (!o.period || (o.period.type !== "long_sleep" && (p.total_sleep_duration || 0) > (o.period.total_sleep_duration || 0)));
      if (better) o.period = p;
    });

    const sleepRows = await sbGet(`sleep_logs?user_id=eq.${uidQ}&select=data&order=created_at.desc`);
    const sleepByDate = new Map();
    sleepRows.forEach(r => { if (r.data?.date && !sleepByDate.has(r.data.date)) sleepByDate.set(r.data.date, r.data); });

    const SLEEP_FIELDS = ["sleepScore", "readiness", "hoursSlept", "rem", "heartRate", "hrv", "respiratoryRate", "wakeTime"];
    let sleepAdded = 0, sleepRepaired = 0;
    const idBase = Date.now();
    let i = 0;
    for (const day of Object.keys(days).sort()) {
      const { ds: d, dr: r2, period: p } = days[day];
      const fresh = {
        sleepScore: str(d?.score), readiness: str(r2?.score),
        hoursSlept: hmm(p?.total_sleep_duration), rem: hmm(p?.rem_sleep_duration),
        heartRate: str(p?.lowest_heart_rate),
        hrv: p?.average_hrv != null ? String(Math.round(p.average_hrv)) : "",
        respiratoryRate: p?.average_breath != null ? String(+p.average_breath.toFixed(1)) : "",
        wakeTime: clockOf(p?.bedtime_end),
      };
      if (!fresh.sleepScore && !fresh.hoursSlept) continue;
      const dDate = display(day);
      const existing = sleepByDate.get(dDate);
      if (!existing) {
        const jh = (fresh.hrv && fresh.heartRate)
          ? (parseFloat(fresh.hrv) - parseFloat(fresh.heartRate)).toFixed(1) : null;
        await sbWrite("sleep_logs", "POST", { user_id: uid, data: { id: idBase + i++, date: dDate, ...fresh, jhSpread: jh } });
        sleepAdded++;
      } else {
        const merged = { ...existing };
        let changed = false;
        for (const k of SLEEP_FIELDS) {
          if (!existing[k] && fresh[k]) { merged[k] = fresh[k]; changed = true; }
        }
        if (changed) {
          merged.jhSpread = (merged.hrv && merged.heartRate)
            ? (parseFloat(merged.hrv) - parseFloat(merged.heartRate)).toFixed(1)
            : merged.jhSpread ?? null;
          await sbWrite(`sleep_logs?user_id=eq.${uidQ}&data->>id=eq.${merged.id}`, "PATCH", { data: merged });
          sleepRepaired++;
        }
      }
    }

    // ── Steps: yesterday and earlier only (today's count is still growing) ──
    const acts = await oura("daily_activity", start, end);
    const dailyRows = await sbGet(`daily_logs?user_id=eq.${uidQ}&select=data&order=created_at.desc`);
    const dailyByDate = new Map();
    dailyRows.forEach(r => { if (r.data?.date && !dailyByDate.has(r.data.date)) dailyByDate.set(r.data.date, r.data); });

    let stepsAdded = 0, stepsFilled = 0;
    for (const a of acts) {
      if (a.steps == null || a.day === end) continue;
      const dDate = display(a.day);
      const existing = dailyByDate.get(dDate);
      if (!existing) {
        await sbWrite("daily_logs", "POST", { user_id: uid, data: { id: idBase + i++, date: dDate, crunches: "", planks: "", pushups: "", steps: String(a.steps), stretches: [], breathing: "", breathProtocol: "", breathSeconds: "" } });
        stepsAdded++;
      } else if (!existing.steps) {
        await sbWrite(`daily_logs?user_id=eq.${uidQ}&data->>id=eq.${existing.id}`, "PATCH", { data: { ...existing, steps: String(a.steps) } });
        stepsFilled++;
      }
    }

    res.setHeader("Cache-Control", "no-store");
    return res.status(200).json({ range: { start, end }, sleepAdded, sleepRepaired, stepsAdded, stepsFilled });
  } catch (e) {
    return res.status(502).json({ error: String(e.message || e) });
  }
}
