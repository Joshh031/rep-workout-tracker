// Vercel serverless function: fetch last night's Oura data and map it to the
// app's sleep-log fields. The Oura personal access token stays server-side —
// set OURA_TOKEN in Vercel (get one at https://cloud.ouraring.com/personal-access-tokens).
//
// GET /api/oura?date=YYYY-MM-DD  (date = wake day; defaults to today, UTC)

const OURA = "https://api.ouraring.com/v2/usercollection";

// seconds -> "H:MM"
const hmm = (sec) => {
  if (!sec && sec !== 0) return "";
  const h = Math.floor(sec / 3600);
  const m = Math.round((sec % 3600) / 60);
  return `${h}:${String(m).padStart(2, "0")}`;
};

export default async function handler(req, res) {
  const token = process.env.OURA_TOKEN;
  if (!token) {
    return res.status(500).json({ error: "OURA_TOKEN is not configured in Vercel environment variables" });
  }

  const end = /^\d{4}-\d{2}-\d{2}$/.test(req.query.date || "")
    ? req.query.date
    : new Date().toISOString().slice(0, 10);
  // Look back two days so a late sync or timezone offset still finds the night
  const startD = new Date(end + "T12:00:00Z");
  startD.setUTCDate(startD.getUTCDate() - 2);
  const start = startD.toISOString().slice(0, 10);

  const get = async (path) => {
    const r = await fetch(`${OURA}/${path}?start_date=${start}&end_date=${end}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!r.ok) throw new Error(`Oura ${path} failed (${r.status})`);
    const j = await r.json();
    return j.data || [];
  };

  try {
    const [dailySleep, dailyReadiness, sleepPeriods] = await Promise.all([
      get("daily_sleep"),
      get("daily_readiness"),
      get("sleep"),
    ]);

    // Newest record wins for each collection
    const latest = (arr) => arr.length ? arr[arr.length - 1] : null;
    const ds = latest(dailySleep);
    const dr = latest(dailyReadiness);

    // Prefer the main overnight sleep for the same day as the sleep score;
    // fall back to the longest period in range.
    const day = ds?.day || end;
    let period = sleepPeriods.filter(p => p.day === day && p.type === "long_sleep").pop()
      || sleepPeriods.filter(p => p.type === "long_sleep").pop()
      || sleepPeriods.sort((a, b) => (a.total_sleep_duration || 0) - (b.total_sleep_duration || 0)).pop();

    if (!ds && !dr && !period) {
      return res.status(404).json({ error: `No Oura data found for ${start}..${end} — has last night synced in the Oura app?` });
    }

    res.setHeader("Cache-Control", "no-store");
    return res.status(200).json({
      day,
      sleepScore: ds?.score ?? null,
      readiness: dr?.score ?? null,
      hoursSlept: hmm(period?.total_sleep_duration),
      rem: hmm(period?.rem_sleep_duration),
      heartRate: period?.lowest_heart_rate ?? null,
      hrv: period?.average_hrv != null ? Math.round(period.average_hrv) : null,
      respiratoryRate: period?.average_breath != null ? +period.average_breath.toFixed(1) : null,
    });
  } catch (e) {
    return res.status(502).json({ error: String(e.message || e) });
  }
}
