import { test, describe, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { mockRes, stubFetch } from "./helpers.js";
import { hmm, clockOf, displayDate, isoDaysAgo, joinByDay, mapNight, fetchAll, jhSpreadOf } from "../api/_oura.js";
import ouraHandler from "../api/oura.js";

// Fixture: 8/1 is a full night (main sleep + a nap), 8/2 is scores-only —
// the "partial sync" shape that used to leave blank rows.
const FIX = {
  daily_sleep: [{ day: "2026-08-01", score: 80 }, { day: "2026-08-02", score: 75 }],
  daily_readiness: [{ day: "2026-08-01", score: 70 }],
  sleep: [
    { day: "2026-08-01", type: "sleep", bedtime_end: "2026-08-01T15:00:00-04:00", total_sleep_duration: 1200 },
    { day: "2026-08-01", type: "long_sleep", bedtime_end: "2026-08-01T06:12:00-04:00",
      total_sleep_duration: 7 * 3600 + 30 * 60, rem_sleep_duration: 5400,
      lowest_heart_rate: 48, average_hrv: 41.6, average_breath: 13.94 },
  ],
  daily_activity: [{ day: "2026-08-01", steps: 8123 }, { day: "2026-08-02", steps: null }],
};
const ouraRoutes = (fix = FIX) => [
  ["/daily_sleep?", () => ({ data: fix.daily_sleep })],
  ["/daily_readiness?", () => ({ data: fix.daily_readiness })],
  ["/sleep?", () => ({ data: fix.sleep })],
  ["/daily_activity?", () => ({ data: fix.daily_activity })],
];

describe("_oura helpers", () => {
  test("hmm formats seconds as H:MM and blanks missing values", () => {
    assert.equal(hmm(7 * 3600 + 30 * 60), "7:30");
    assert.equal(hmm(59), "0:01");
    assert.equal(hmm(undefined), "");
    assert.equal(hmm(0), "0:00");
  });
  test("clockOf reads the literal local time, ignoring the UTC offset", () => {
    assert.equal(clockOf("2026-08-01T06:12:00-04:00"), "06:12");
    assert.equal(clockOf("2026-08-01T06:12:00+00:00"), "06:12");
    assert.equal(clockOf(undefined), "");
  });
  test("displayDate matches the app's M/D/YYYY join key", () => {
    assert.equal(displayDate("2026-08-05"), "8/5/2026");
    assert.equal(displayDate("2026-12-25"), "12/25/2026");
  });
  test("isoDaysAgo crosses month boundaries", () => {
    assert.equal(isoDaysAgo(2, "2026-09-01"), "2026-08-30");
    assert.equal(isoDaysAgo(0, "2026-09-01"), "2026-09-01");
  });
  test("joinByDay prefers the long_sleep period over a nap", () => {
    const days = joinByDay(FIX.daily_sleep, FIX.daily_readiness, FIX.sleep);
    assert.equal(days["2026-08-01"].period.type, "long_sleep");
    assert.equal(days["2026-08-02"].period, undefined);
  });
  test("mapNight rounds HRV and breath rate and blanks missing details", () => {
    const days = joinByDay(FIX.daily_sleep, FIX.daily_readiness, FIX.sleep);
    const n = mapNight("2026-08-01", days["2026-08-01"].ds, days["2026-08-01"].dr, days["2026-08-01"].period);
    assert.deepEqual(n, { day: "2026-08-01", wakeTime: "06:12", sleepScore: 80, readiness: 70, hoursSlept: "7:30", rem: "1:30", heartRate: 48, hrv: 42, respiratoryRate: 13.9 });
    const p = mapNight("2026-08-02", days["2026-08-02"].ds, undefined, undefined);
    assert.equal(p.sleepScore, 75);
    assert.equal(p.hoursSlept, "");
    assert.equal(p.hrv, null);
  });
  test("jhSpreadOf is HRV minus resting HR, or null when either is blank", () => {
    assert.equal(jhSpreadOf("42", "48"), "-6.0");
    assert.equal(jhSpreadOf("", "48"), null);
    assert.equal(jhSpreadOf(null, "48"), null);
  });
  test("fetchAll follows next_token pagination", async () => {
    const f = stubFetch([[/next_token=p2/, () => ({ data: [{ day: "b" }] })], ["/sleep?", () => ({ data: [{ day: "a" }], next_token: "p2" })]]);
    try {
      const rows = await fetchAll("tok", "sleep", "2026-08-01", "2026-08-31");
      assert.deepEqual(rows.map(r => r.day), ["a", "b"]);
      assert.equal(f.calls.length, 2);
      assert.equal(f.calls[0].headers.Authorization, "Bearer tok");
    } finally { f.restore(); }
  });
});

describe("/api/oura", () => {
  let f;
  beforeEach(() => { process.env.APP_SECRET = "pass"; process.env.OURA_TOKEN = "tok"; f = stubFetch(ouraRoutes()); });
  afterEach(() => f.restore());
  const call = async (query, headers = { "x-app-secret": "pass" }) => {
    const res = mockRes();
    await ouraHandler({ query, headers }, res);
    return res;
  };

  test("rejects a bad passphrase before touching Oura", async () => {
    const res = await call({ date: "2026-08-01" }, { "x-app-secret": "nope" });
    assert.equal(res.statusCode, 401);
    assert.equal(f.calls.length, 0);
  });
  test("range mode returns nights plus coverage of what Oura actually had", async () => {
    const res = await call({ start: "2026-08-01", end: "2026-08-03" });
    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.body.nights.map(n => n.day), ["2026-08-01", "2026-08-02"]);
    assert.deepEqual(res.body.coverage, { requested: { start: "2026-08-01", end: "2026-08-03" }, returned: 2, first: "2026-08-01", last: "2026-08-02", withDetails: 1 });
    assert.equal(res.headers["Cache-Control"], "no-store");
  });
  test("range mode rejects windows over a year", async () => {
    const res = await call({ start: "2024-01-01", end: "2026-08-03" });
    assert.equal(res.statusCode, 400);
  });
  test("single-night mode returns the latest day in the 2-day lookback", async () => {
    const res = await call({ date: "2026-08-03" });
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.day, "2026-08-02"); // scores-only, and the app tells the user so
    assert.equal(res.body.sleepScore, 75);
  });
  test("single-night mode is 404 when Oura has nothing", async () => {
    f.restore();
    f = stubFetch(ouraRoutes({ daily_sleep: [], daily_readiness: [], sleep: [], daily_activity: [] }));
    const res = await call({ date: "2026-08-03" });
    assert.equal(res.statusCode, 404);
  });
  test("activity modes return steps and skip days without a count", async () => {
    const one = await call({ activity: "2026-08-01" });
    assert.deepEqual(one.body, { day: "2026-08-01", steps: 8123 });
    const range = await call({ activity_start: "2026-08-01", activity_end: "2026-08-03" });
    assert.deepEqual(range.body.days, [{ day: "2026-08-01", steps: 8123 }]);
  });
  test("ignores malformed dates instead of passing them to Oura", async () => {
    const res = await call({ start: "08/01/2026" });
    // falls through to single-night mode with today's date
    assert.equal(res.statusCode, 200);
    assert.ok(f.calls.every(c => /start_date=\d{4}-\d{2}-\d{2}/.test(c.url)));
  });
  test("surfaces Oura failures as 502 with the status", async () => {
    f.restore();
    f = stubFetch([["ouraring", () => ({ ok: false, status: 429, json: async () => ({}) })]]);
    const res = await call({ date: "2026-08-03" });
    assert.equal(res.statusCode, 502);
    assert.match(res.body.error, /429/);
  });
});
