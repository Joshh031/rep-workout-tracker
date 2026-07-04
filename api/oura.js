// Vercel serverless function: fetch Oura data and map it to the app's
// sleep-log fields. The Oura personal access token stays server-side —
// set OURA_TOKEN in Vercel (get one at https://cloud.ouraring.com/personal-access-tokens).
//
// GET /api/oura?date=YYYY-MM-DD               -> single night (date = wake day; defaults to today)
// GET /api/oura?start=YYYY-MM-DD&end=YYYY-MM-DD -> { nights: [...] } for backfill
// GET /api/oura?activity=YYYY-MM-DD           -> { day, steps } from daily_activity

const OURA = "https://api.ouraring.com/v2/usercollection";
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// seconds -> "H:MM"
const hmm = (sec) => {
  if (!sec && sec !== 0) return "";
  const h = Math.floor(sec / 3600);
  const m = Math.round((sec % 3600) / 60);
  return `${h}:${String(m).padStart(2, "0")}`;
};

// Map one day's joined records to the app's field shape
const mapNight = (day, ds, dr, period) => ({
  day,
  sleepScore: ds?.score ?? null,
  readiness: dr?.score ?? null,
  hoursSlept: hmm(period?.total_sleep_duration),
  rem: hmm(period?.rem_sleep_duration),
  heartRate: period?.lowest_heart_rate ?? null,
  hrv: period?.average_hrv != null ? Math.round(period.average_hrv) : null,
  respiratoryRate: period?.average_breath != null ? +period.average_breath.toFixed(1) : null,
});

export default async function handler(req, res) {
  const token = process.env.OURA_TOKEN;
  if (!token) {
    return res.status(500).json({ error: "OURA_TOKEN is not configured in Vercel environment variables" });
  }

  // Fetch every page of a collection in [start, end]
  const getAll = async (path, start, end) => {
    const out = [];
    let pageToken = null;
    do {
      const url = `${OURA}/${path}?start_date=${start}&end_date=${end}` +
        (pageToken ? `&next_token=${encodeURIComponent(pageToken)}` : "");
      const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (!r.ok) throw new Error(`Oura ${path} failed (${r.status})`);
      const j = await r.json();
      out.push(...(j.data || []));
      pageToken = j.next_token || null;
    } while (pageToken);
    return out;
  };

  // Join the three collections into one record per day. For sleep periods,
  // prefer the main overnight sleep; fall back to the longest period that day.
  const joinByDay = (dailySleep, dailyReadiness, sleepPeriods) => {
    const days = {};
    dailySleep.forEach(d => { (days[d.day] ||= {}).ds = d; });
    dailyReadiness.forEach(d => { (days[d.day] ||= {}).dr = d; });
    sleepPeriods.forEach(p => {
      const o = days[p.day] ||= {};
      const better = p.type === "long_sleep"
        ? (o.period?.type !== "long_sleep" || (p.total_sleep_duration || 0) > (o.period.total_sleep_duration || 0))
        : (!o.period || (o.period.type !== "long_sleep" && (p.total_sleep_duration || 0) > (o.period.total_sleep_duration || 0)));
      if (better) o.period = p;
    });
    return days;
  };

  try {
    // ── Activity mode (daily steps) ──
    if (DATE_RE.test(req.query.activity || "")) {
      const day = req.query.activity;
      const startD = new Date(day + "T12:00:00Z");
      startD.setUTCDate(startD.getUTCDate() - 1);
      const acts = await getAll("daily_activity", startD.toISOString().slice(0, 10), day);
      const rec = acts.filter(a => a.day <= day).pop();
      if (!rec) {
        return res.status(404).json({ error: `No Oura activity data for ${day} yet` });
      }
      res.setHeader("Cache-Control", "no-store");
      return res.status(200).json({ day: rec.day, steps: rec.steps ?? null });
    }

    // ── Range mode (backfill) ──
    if (DATE_RE.test(req.query.start || "")) {
      const start = req.query.start;
      const end = DATE_RE.test(req.query.end || "") ? req.query.end : new Date().toISOString().slice(0, 10);
      if ((new Date(end) - new Date(start)) / 86400000 > 370) {
        return res.status(400).json({ error: "Range too large — max 370 days" });
      }
      const [ds, dr, sp] = await Promise.all([
        getAll("daily_sleep", start, end),
        getAll("daily_readiness", start, end),
        getAll("sleep", start, end),
      ]);
      const days = joinByDay(ds, dr, sp);
      const nights = Object.keys(days).sort()
        .map(day => mapNight(day, days[day].ds, days[day].dr, days[day].period))
        .filter(n => n.sleepScore != null || n.hoursSlept); // drop empty days
      res.setHeader("Cache-Control", "no-store");
      return res.status(200).json({ nights });
    }

    // ── Single-night mode (SYNC button) ──
    const end = DATE_RE.test(req.query.date || "") ? req.query.date : new Date().toISOString().slice(0, 10);
    // Look back two days so a late sync or timezone offset still finds the night
    const startD = new Date(end + "T12:00:00Z");
    startD.setUTCDate(startD.getUTCDate() - 2);
    const start = startD.toISOString().slice(0, 10);

    const [ds, dr, sp] = await Promise.all([
      getAll("daily_sleep", start, end),
      getAll("daily_readiness", start, end),
      getAll("sleep", start, end),
    ]);
    if (!ds.length && !dr.length && !sp.length) {
      return res.status(404).json({ error: `No Oura data found for ${start}..${end} — has last night synced in the Oura app?` });
    }
    const days = joinByDay(ds, dr, sp);
    const day = Object.keys(days).sort().pop();
    const d = days[day];
    res.setHeader("Cache-Control", "no-store");
    return res.status(200).json(mapNight(day, d.ds, d.dr, d.period));
  } catch (e) {
    return res.status(502).json({ error: String(e.message || e) });
  }
}
