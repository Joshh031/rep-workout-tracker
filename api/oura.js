// Vercel serverless function: fetch Oura data and map it to the app's
// sleep-log fields. The Oura personal access token stays server-side —
// set OURA_TOKEN in Vercel (get one at https://cloud.ouraring.com/personal-access-tokens).
//
// GET /api/oura?date=YYYY-MM-DD                  -> single night (date = wake day; defaults to today)
// GET /api/oura?start=YYYY-MM-DD&end=YYYY-MM-DD  -> { nights, coverage } for backfill
// GET /api/oura?activity=YYYY-MM-DD              -> { day, steps } from daily_activity
// GET /api/oura?activity_start=&activity_end=    -> { days: [{day, steps}] }
// GET /api/oura?debug=1&start=&end=&s=<pass>     -> raw per-day tagging for diagnosis

import { checkAuth } from "./_auth.js";
import { DATE_RE, hmm, isoDaysAgo, fetchAll, fetchNights, mapNight } from "./_oura.js";

const todayIso = () => new Date().toISOString().slice(0, 10);
const validDate = (v) => (DATE_RE.test(v || "") ? v : null);
const MAX_RANGE_DAYS = 370;

export default async function handler(req, res) {
  if (!checkAuth(req, res)) return;
  const token = process.env.OURA_TOKEN;
  if (!token) {
    return res.status(500).json({ error: "OURA_TOKEN is not configured in Vercel environment variables" });
  }
  const q = req.query || {};
  const noStore = () => res.setHeader("Cache-Control", "no-store");
  const rangeTooLarge = (start, end) => (new Date(end) - new Date(start)) / 86400000 > MAX_RANGE_DAYS;

  try {
    // ── Debug mode: Oura's raw day-tagging for a range ──
    if (q.debug) {
      const end = validDate(q.end) || todayIso();
      const start = validDate(q.start) || isoDaysAgo(7, end);
      const { raw } = await fetchNights(token, start, end);
      noStore();
      return res.status(200).json({
        range: { start, end },
        daily_sleep: raw.ds.map(d => ({ day: d.day, score: d.score })),
        daily_readiness: raw.dr.map(d => ({ day: d.day, score: d.score })),
        sleep_periods: raw.sp.map(p => ({
          day: p.day, type: p.type,
          bedtime_start: p.bedtime_start, bedtime_end: p.bedtime_end,
          hours: hmm(p.total_sleep_duration), rem: hmm(p.rem_sleep_duration),
          lowest_hr: p.lowest_heart_rate ?? null, avg_hrv: p.average_hrv ?? null,
        })),
      });
    }

    // ── Activity range mode (steps backfill) ──
    if (validDate(q.activity_start)) {
      const start = q.activity_start;
      const end = validDate(q.activity_end) || todayIso();
      if (rangeTooLarge(start, end)) return res.status(400).json({ error: `Range too large — max ${MAX_RANGE_DAYS} days` });
      const acts = await fetchAll(token, "daily_activity", start, end);
      noStore();
      return res.status(200).json({
        days: acts.filter(a => a.steps != null).map(a => ({ day: a.day, steps: a.steps })),
      });
    }

    // ── Activity mode (one day's steps) ──
    if (validDate(q.activity)) {
      const day = q.activity;
      const acts = await fetchAll(token, "daily_activity", isoDaysAgo(1, day), day);
      const rec = acts.filter(a => a.day <= day).pop();
      if (!rec) return res.status(404).json({ error: `No Oura activity data for ${day} yet` });
      noStore();
      return res.status(200).json({ day: rec.day, steps: rec.steps ?? null });
    }

    // ── Range mode (sleep backfill) ──
    if (validDate(q.start)) {
      const start = q.start;
      const end = validDate(q.end) || todayIso();
      if (rangeTooLarge(start, end)) return res.status(400).json({ error: `Range too large — max ${MAX_RANGE_DAYS} days` });
      const { nights } = await fetchNights(token, start, end);
      noStore();
      // coverage lets the client say what Oura actually had, not just what
      // the app added — the difference is the diagnosis when days are missing
      return res.status(200).json({
        nights,
        coverage: {
          requested: { start, end },
          returned: nights.length,
          first: nights[0]?.day || null,
          last: nights[nights.length - 1]?.day || null,
          withDetails: nights.filter(n => n.hoursSlept).length,
        },
      });
    }

    // ── Single-night mode (SYNC button) ──
    const end = validDate(q.date) || todayIso();
    // Look back two days so a late sync or timezone offset still finds the night
    const { days } = await fetchNights(token, isoDaysAgo(2, end), end);
    const dayKeys = Object.keys(days).sort();
    if (!dayKeys.length) {
      return res.status(404).json({ error: `No Oura data found for ${isoDaysAgo(2, end)}..${end} — has last night synced in the Oura app?` });
    }
    const day = dayKeys[dayKeys.length - 1];
    const d = days[day];
    noStore();
    return res.status(200).json(mapNight(day, d.ds, d.dr, d.period));
  } catch (e) {
    return res.status(502).json({ error: String(e.message || e) });
  }
}
