// Decides what a reminder should say, given the user's logs. Pure — no
// I/O — so it's unit-tested and shared by the cron sender.

// "2026-09-27" (a calendar day in the user's timezone) -> "9/27/2026"
export const displayDate = (iso) => {
  const [y, m, d] = iso.split("-");
  return `${+m}/${+d}/${y}`;
};

// Calendar day in an IANA timezone, as YYYY-MM-DD, `offsetDays` from now
export function localDay(tz, offsetDays = 0, now = new Date()) {
  const t = new Date(now.getTime() + offsetDays * 86400000);
  return new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(t);
}

// Local hour (0-23) in an IANA timezone
export function localHour(tz, now = new Date()) {
  return +new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "numeric", hour12: false }).format(now).replace(/^24$/, "0");
}

// Mirrors the app's breathSecondsOf: entries saved before duration was
// tracked are estimated from round count × protocol length.
const BREATH_GOAL_SEC = 240;
const ROUND_SEC = { box: 16, "478": 19 };
const breathSeconds = (d) => {
  if (!d) return 0;
  if (d.breathSeconds) return +d.breathSeconds || 0;
  return (+d.breathing || 0) * (ROUND_SEC[d.breathProtocol] || ROUND_SEC.box);
};

// What's missing for one stored date ("9/27/2026"), mirroring the app's backlog card
export function missingFor(date, { workouts = [], daily = [], sleep = [] }, { includeWorkout = true } = {}) {
  const missing = [];
  if (includeWorkout && !workouts.some(w => w.date === date)) missing.push("workout");
  if (!sleep.some(s => s.date === date)) missing.push("sleep");
  const d = daily.find(x => x.date === date);
  if (!d?.steps) missing.push("steps");
  if (!d?.crunches) missing.push("crunches");
  if (!d?.planks) missing.push("planks");
  if (!d?.pushups) missing.push("push-ups");
  if (!d?.stretches?.length) missing.push("stretches");
  if (breathSeconds(d) < BREATH_GOAL_SEC) missing.push("breathing");
  return missing;
}

const ALL = 8; // number of tracked items

// Build the reminder for a slot. Returns null when nothing needs saying.
//   "am": last night's sleep + anything still missing from yesterday
//   "pm": what's still missing from today
export function buildReminder(slot, logs, { tz = "America/New_York", now = new Date() } = {}) {
  if (slot === "pm") {
    const today = displayDate(localDay(tz, 0, now));
    const missing = missingFor(today, logs);
    if (!missing.length) return null;
    const all = missing.length === ALL;
    return {
      title: all ? "Nothing logged today" : "Today isn't done",
      body: all ? "No workout, sleep, steps or daily routine yet — open REP" : `Still missing: ${missing.join(" · ")}`,
      tag: "rep-pm",
      url: missing.includes("workout") && missing.length > 4 ? "/" : "/?tab=daily",
    };
  }
  // am
  const today = displayDate(localDay(tz, 0, now));
  const yesterday = displayDate(localDay(tz, -1, now));
  const sleepMissing = !logs.sleep?.some(s => s.date === today);
  const yMissing = missingFor(yesterday, logs);
  if (!sleepMissing && !yMissing.length) return null;
  const parts = [];
  if (sleepMissing) parts.push("Log last night's sleep");
  if (yMissing.length) parts.push(yMissing.length === ALL ? "Yesterday has nothing logged" : `Yesterday still missing: ${yMissing.join(" · ")}`);
  return {
    title: sleepMissing ? "Morning — sleep first" : "Yesterday isn't done",
    body: parts.join(". "),
    tag: "rep-am",
    url: sleepMissing ? "/?tab=sleep" : "/?tab=daily",
  };
}
