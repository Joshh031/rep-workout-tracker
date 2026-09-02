import { test, describe, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { mockRes, stubFetch } from "./helpers.js";
import autoSync from "../api/auto-sync.js";

const today = new Date().toISOString().slice(0, 10);
const dayMinus = (n) => { const d = new Date(today + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() - n); return d.toISOString().slice(0, 10); };
const disp = (iso) => { const [y, m, d] = iso.split("-"); return `${+m}/${+d}/${y}`; };
const D1 = dayMinus(3), D2 = dayMinus(2), D3 = dayMinus(1);

const OURA = {
  daily_sleep: [{ day: D1, score: 80 }, { day: D2, score: 75 }, { day: D3, score: 90 }],
  daily_readiness: [{ day: D1, score: 70 }, { day: D3, score: 85 }],
  sleep: [
    { day: D1, type: "long_sleep", bedtime_end: `${D1}T06:12:00-04:00`, total_sleep_duration: 27000, rem_sleep_duration: 5400, lowest_heart_rate: 48, average_hrv: 41.6, average_breath: 13.9 },
    // D2: scores only (details never arrived)
    { day: D3, type: "long_sleep", bedtime_end: `${D3}T05:50:00-04:00`, total_sleep_duration: 25200, rem_sleep_duration: 4800, lowest_heart_rate: 50, average_hrv: 38, average_breath: 14.2 },
  ],
  daily_activity: [{ day: D1, steps: 8000 }, { day: D3, steps: 12000 }, { day: today, steps: 300 }],
};

// Supabase state: D2 already logged (scores only, matches Oura → nothing to do),
// D3 logged scores-only but Oura now has details → repair; D1 missing → create.
// daily_logs: D3 exists with blank steps → fill; D1 missing → create; today skipped.
const DB = {
  sleep: [
    { data: { id: 2, date: disp(D2), sleepScore: "75", readiness: "", hoursSlept: "", rem: "", heartRate: "", hrv: "", respiratoryRate: "", wakeTime: "" } },
    { data: { id: 3, date: disp(D3), sleepScore: "90", readiness: "85", hoursSlept: "", rem: "", heartRate: "", hrv: "", respiratoryRate: "", wakeTime: "" } },
  ],
  daily: [{ data: { id: 30, date: disp(D3), crunches: "50", steps: "" } }],
};

const routes = (db = DB) => [
  ["/daily_sleep?", () => ({ data: OURA.daily_sleep })],
  ["/daily_readiness?", () => ({ data: OURA.daily_readiness })],
  ["/sleep?", () => ({ data: OURA.sleep })],
  ["/daily_activity?", () => ({ data: OURA.daily_activity })],
  [/sleep_logs\?select=user_id/, () => [{ user_id: "user_x" }]],
  [/sleep_logs\?user_id=eq\.user_x&select=data/, () => db.sleep],
  [/daily_logs\?user_id=eq\.user_x&select=data/, () => db.daily],
  [/rest\/v1\/(sleep_logs|daily_logs)/, () => ({ ok: true, status: 201, json: async () => ({}) })],
];

describe("/api/auto-sync", () => {
  let f;
  beforeEach(() => {
    process.env.OURA_TOKEN = "tok";
    process.env.SUPABASE_URL = "https://x.supabase.co";
    process.env.SUPABASE_SERVICE_KEY = "sb_secret_abc";
    delete process.env.CRON_SECRET;
  });
  afterEach(() => f?.restore());
  const writes = () => f.calls.filter(c => c.url.includes("supabase") && c.method !== "GET");

  test("creates missing nights, repairs partial ones, fills steps, skips today", async () => {
    f = stubFetch(routes());
    const res = mockRes();
    await autoSync({ headers: {} }, res);
    assert.equal(res.statusCode, 200, JSON.stringify(res.body));
    assert.deepEqual({ ...res.body, range: undefined }, { range: undefined, nightsFromOura: 3, sleepAdded: 1, sleepRepaired: 1, stepsAdded: 1, stepsFilled: 1 });

    const w = writes();
    const sleepPost = w.find(c => c.method === "POST" && c.url.endsWith("/sleep_logs"));
    assert.equal(sleepPost.body.user_id, "user_x");
    assert.equal(sleepPost.body.data.date, disp(D1));
    assert.equal(sleepPost.body.data.wakeTime, "06:12");
    assert.equal(sleepPost.body.data.hrv, "42");
    assert.equal(sleepPost.body.data.jhSpread, "-6.0");

    const sleepPatch = w.find(c => c.method === "PATCH" && c.url.includes("sleep_logs"));
    assert.match(sleepPatch.url, /data->>id=eq\.3/);
    assert.equal(sleepPatch.body.data.sleepScore, "90"); // kept
    assert.equal(sleepPatch.body.data.hoursSlept, "7:00"); // filled
    assert.equal(sleepPatch.body.data.wakeTime, "05:50");

    const dailyPatch = w.find(c => c.method === "PATCH" && c.url.includes("daily_logs"));
    assert.equal(dailyPatch.body.data.crunches, "50"); // untouched
    assert.equal(dailyPatch.body.data.steps, "12000");
    const dailyPost = w.find(c => c.method === "POST" && c.url.endsWith("/daily_logs"));
    assert.equal(dailyPost.body.data.date, disp(D1));
    assert.ok(!w.some(c => c.body?.data?.date === disp(today)), "today's steps must not be written");
    // Every write went out with the service key, never a JWT header for sb_secret keys
    assert.ok(w.every(c => c.headers.apikey === "sb_secret_abc" && !c.headers.Authorization));
  });

  test("is idempotent: a fully-synced database produces zero writes", async () => {
    const full = {
      sleep: [
        { data: { id: 1, date: disp(D1), sleepScore: "80", readiness: "70", hoursSlept: "7:30", rem: "1:30", heartRate: "48", hrv: "42", respiratoryRate: "13.9", wakeTime: "06:12" } },
        { data: { id: 2, date: disp(D2), sleepScore: "75" } },
        { data: { id: 3, date: disp(D3), sleepScore: "90", readiness: "85", hoursSlept: "7:00", rem: "1:20", heartRate: "50", hrv: "38", respiratoryRate: "14.2", wakeTime: "05:50" } },
      ],
      daily: [{ data: { id: 10, date: disp(D1), steps: "8000" } }, { data: { id: 30, date: disp(D3), steps: "12000" } }],
    };
    f = stubFetch(routes(full));
    const res = mockRes();
    await autoSync({ headers: {} }, res);
    assert.equal(res.statusCode, 200);
    assert.deepEqual(writes(), []);
    assert.deepEqual({ ...res.body, range: undefined }, { range: undefined, nightsFromOura: 3, sleepAdded: 0, sleepRepaired: 0, stepsAdded: 0, stepsFilled: 0 });
  });

  test("honours CRON_SECRET when set", async () => {
    process.env.CRON_SECRET = "cron";
    f = stubFetch(routes());
    const bad = mockRes();
    await autoSync({ headers: {} }, bad);
    assert.equal(bad.statusCode, 401);
    const good = mockRes();
    await autoSync({ headers: { authorization: "Bearer cron" } }, good);
    assert.equal(good.statusCode, 200);
  });

  test("fails loudly when env is missing", async () => {
    delete process.env.OURA_TOKEN;
    f = stubFetch(routes());
    const res = mockRes();
    await autoSync({ headers: {} }, res);
    assert.equal(res.statusCode, 500);
  });
});
