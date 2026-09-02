// Shared Oura API helpers used by /api/oura (on-demand sync/backfill) and
// /api/auto-sync (daily cron). Not an endpoint (leading underscore).

export const OURA = "https://api.ouraring.com/v2/usercollection";
export const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// seconds -> "H:MM"
export const hmm = (sec) => {
  if (!sec && sec !== 0) return "";
  const h = Math.floor(sec / 3600);
  const m = Math.round((sec % 3600) / 60);
  return `${h}:${String(m).padStart(2, "0")}`;
};

// Local wall-clock "HH:MM" from an Oura ISO timestamp. Parse the literal
// time in the string — the server runs in UTC, so a Date conversion would
// shift the user's local time.
export const clockOf = (iso) =>
  (typeof iso === "string" && (iso.match(/T(\d{2}:\d{2})/) || [])[1]) || "";

// "2026-08-20" -> "8/20/2026" (the app's stored date format)
export const displayDate = (day) => {
  const [y, m, d] = day.split("-");
  return `${+m}/${+d}/${y}`;
};

export const str = (v) => (v != null ? String(v) : "");

// ISO date n days before `fromIso` (default: today, UTC)
export const isoDaysAgo = (n, fromIso = new Date().toISOString().slice(0, 10)) => {
  const d = new Date(fromIso + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
};

// Fetch every page of a collection in [start, end]
export async function fetchAll(token, path, start, end) {
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
}

// Join the three sleep collections into one record per day. For sleep
// periods, prefer the main overnight sleep; fall back to the longest period.
export function joinByDay(dailySleep, dailyReadiness, sleepPeriods) {
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
}

// One day's joined records -> the app's field shape (numbers where numeric)
export function mapNight(day, ds, dr, period) {
  return {
    day,
    wakeTime: clockOf(period?.bedtime_end),
    sleepScore: ds?.score ?? null,
    readiness: dr?.score ?? null,
    hoursSlept: hmm(period?.total_sleep_duration),
    rem: hmm(period?.rem_sleep_duration),
    heartRate: period?.lowest_heart_rate ?? null,
    hrv: period?.average_hrv != null ? Math.round(period.average_hrv) : null,
    respiratoryRate: period?.average_breath != null ? +period.average_breath.toFixed(1) : null,
  };
}

// Storage-shaped strings for a night (what the app writes to Supabase)
export const SLEEP_FIELDS = ["sleepScore", "readiness", "hoursSlept", "rem", "heartRate", "hrv", "respiratoryRate", "wakeTime"];
export function nightToStrings(n) {
  return {
    sleepScore: str(n.sleepScore), readiness: str(n.readiness),
    hoursSlept: n.hoursSlept || "", rem: n.rem || "",
    heartRate: str(n.heartRate), hrv: str(n.hrv),
    respiratoryRate: str(n.respiratoryRate), wakeTime: n.wakeTime || "",
  };
}
export const jhSpreadOf = (hrv, hr) =>
  (hrv !== "" && hrv != null && hr !== "" && hr != null)
    ? (parseFloat(hrv) - parseFloat(hr)).toFixed(1)
    : null;

// All nights in [start, end], oldest first, empty days dropped
export async function fetchNights(token, start, end) {
  const [ds, dr, sp] = await Promise.all([
    fetchAll(token, "daily_sleep", start, end),
    fetchAll(token, "daily_readiness", start, end),
    fetchAll(token, "sleep", start, end),
  ]);
  const days = joinByDay(ds, dr, sp);
  const nights = Object.keys(days).sort()
    .map(day => mapNight(day, days[day].ds, days[day].dr, days[day].period))
    .filter(n => n.sleepScore != null || n.hoursSlept);
  return { days, nights, raw: { ds, dr, sp } };
}
