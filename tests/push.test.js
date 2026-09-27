import { test, describe, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { mockRes, stubFetch } from "./helpers.js";
import { buildReminder, missingFor, localDay, localHour, displayDate } from "../api/_reminders.js";
import pushHandler from "../api/push.js";

const TZ = "America/New_York";
// 2026-09-27 20:05 ET = 2026-09-28T00:05Z
const PM = new Date("2026-09-28T00:05:00Z");
// 2026-09-27 08:00 ET = 12:00Z
const AM = new Date("2026-09-27T12:00:00Z");

const full = { date: "9/27/2026", steps: "8000", crunches: "100", planks: "3", pushups: "50", stretches: ["calves"], breathSeconds: "240" };

describe("_reminders", () => {
  test("localDay / localHour respect the timezone across the UTC midnight", () => {
    assert.equal(localDay(TZ, 0, PM), "2026-09-27");
    assert.equal(localDay(TZ, -1, PM), "2026-09-26");
    assert.equal(localHour(TZ, PM), 20);
    assert.equal(localHour(TZ, AM), 8);
    assert.equal(displayDate("2026-09-07"), "9/7/2026");
  });
  test("missingFor mirrors the backlog card, incl. legacy breathing rounds", () => {
    assert.deepEqual(missingFor("9/27/2026", {}), ["workout", "sleep", "steps", "crunches", "planks", "push-ups", "stretches", "breathing"]);
    assert.deepEqual(missingFor("9/27/2026", { workouts: [{ date: "9/27/2026" }], sleep: [{ date: "9/27/2026" }], daily: [full] }), []);
    const legacy = { ...full, breathSeconds: "", breathing: "15", breathProtocol: "box" }; // 15 × 16s = 240
    assert.deepEqual(missingFor("9/27/2026", { workouts: [{ date: "9/27/2026" }], sleep: [{ date: "9/27/2026" }], daily: [legacy] }), []);
    assert.deepEqual(missingFor("9/27/2026", { workouts: [{ date: "9/27/2026" }], sleep: [{ date: "9/27/2026" }], daily: [{ ...legacy, breathing: "5" }] }), ["breathing"]);
  });
  test("pm: silent when today is complete, itemised when partly done, blunt when empty", () => {
    const done = { workouts: [{ date: "9/27/2026" }], sleep: [{ date: "9/27/2026" }], daily: [full] };
    assert.equal(buildReminder("pm", done, { tz: TZ, now: PM }), null);
    const partial = buildReminder("pm", { ...done, daily: [{ ...full, planks: "", stretches: [] }] }, { tz: TZ, now: PM });
    assert.equal(partial.title, "Today isn't done");
    assert.equal(partial.body, "Still missing: planks · stretches");
    assert.equal(partial.url, "/?tab=daily");
    const empty = buildReminder("pm", {}, { tz: TZ, now: PM });
    assert.equal(empty.title, "Nothing logged today");
    assert.equal(empty.url, "/");
  });
  test("am: asks for last night's sleep and anything left from yesterday", () => {
    const r = buildReminder("am", { sleep: [], workouts: [{ date: "9/26/2026" }], daily: [{ ...full, date: "9/26/2026" }] }, { tz: TZ, now: AM });
    assert.equal(r.title, "Morning — sleep first");
    assert.equal(r.body, "Log last night's sleep. Yesterday still missing: sleep");
    assert.equal(r.url, "/?tab=sleep");
    const ok = buildReminder("am", { sleep: [{ date: "9/27/2026" }, { date: "9/26/2026" }], workouts: [{ date: "9/26/2026" }], daily: [{ ...full, date: "9/26/2026" }] }, { tz: TZ, now: AM });
    assert.equal(ok, null);
  });
});

describe("/api/push", () => {
  let f;
  const rows = { subs: [], workouts: [], daily: [], sleep: [] };
  beforeEach(() => {
    process.env.APP_SECRET = "pass";
    process.env.SUPABASE_URL = "https://x.supabase.co";
    process.env.SUPABASE_SERVICE_KEY = "sb_secret_abc";
    // Throwaway pair generated for tests only (never used in production)
    process.env.VAPID_PUBLIC_KEY = "BN2eG0p9WuOWzFX4-DeW9Yal9dkGOOe1w9W60S27jJlBwtxDHcPQi43malnQxhGe9iEaW9zPKtndjinhI3bbMww";
    process.env.VAPID_PRIVATE_KEY = "hdRIJBEeyx8RbEbwFWHDbP4ywsJ9qDVYVyYpx6Re70k";
    delete process.env.CRON_SECRET;
    rows.subs = [{ user_id: "u1", data: { endpoint: "https://push/e1", keys: {} } }];
    rows.workouts = []; rows.daily = []; rows.sleep = [];
    f = stubFetch([
      [/push_subscriptions\?select/, () => rows.subs],
      [/push_subscriptions/, () => ({ ok: true, status: 204, json: async () => null })],
      [/\/workouts\?/, () => rows.workouts],
      [/\/daily_logs\?/, () => rows.daily],
      [/\/sleep_logs\?/, () => rows.sleep],
    ]);
  });
  afterEach(() => f.restore());
  const H = { "x-app-secret": "pass" };
  const call = (req, send) => { const res = mockRes(); return pushHandler({ headers: H, ...req }, res, { send }).then(() => res); };

  test("config is public and reports whether VAPID is set", async () => {
    const res = mockRes();
    await pushHandler({ method: "GET", query: { config: "1" }, headers: {} }, res, {});
    assert.deepEqual(res.body, { publicKey: process.env.VAPID_PUBLIC_KEY, enabled: true });
    delete process.env.VAPID_PRIVATE_KEY;
    const off = mockRes();
    await pushHandler({ method: "GET", query: { config: "1" }, headers: {} }, off, {});
    assert.equal(off.body.enabled, false);
    assert.match(off.body.error, /VAPID/);
  });
  test("subscribe stores one row per endpoint", async () => {
    const res = await call({ method: "POST", query: {}, body: { subscription: { endpoint: "https://push/e1", keys: { p256dh: "a", auth: "b" } }, user_id: "u1" } });
    assert.equal(res.statusCode, 200);
    const writes = f.calls.filter(c => c.url.includes("push_subscriptions"));
    assert.deepEqual(writes.map(c => c.method), ["DELETE", "POST"]);
    assert.equal(writes[1].body.user_id, "u1");
  });
  test("cron send: pushes an itemised reminder and forgets dead endpoints", async () => {
    rows.subs.push({ user_id: "u1", data: { endpoint: "https://push/dead", keys: {} } });
    const sent = [];
    const send = async (sub, payload) => { if (sub.endpoint.includes("dead")) { const e = new Error("gone"); e.statusCode = 410; throw e; } sent.push({ sub, payload }); };
    const res = await call({ method: "GET", query: { send: "pm" } }, send);
    assert.equal(res.statusCode, 200, JSON.stringify(res.body));
    assert.equal(res.body.sent, 1);
    assert.equal(res.body.removed, 1);
    assert.equal(sent[0].payload.title, "Nothing logged today");
    assert.ok(f.calls.some(c => c.method === "DELETE" && c.url.includes(encodeURIComponent("https://push/dead"))));
    // data queries are scoped to the user and to today/yesterday only
    const wq = f.calls.find(c => c.url.includes("/workouts?"));
    assert.match(wq.url, /user_id=eq\.u1/);
    assert.match(wq.url, /data->>date=in\./);
  });
  test("cron send: nothing missing → nothing sent", async () => {
    const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" }).format(new Date());
    const [y, m, d] = today.split("-"); const disp = `${+m}/${+d}/${y}`;
    rows.workouts = [{ data: { date: disp } }]; rows.sleep = [{ data: { date: disp } }];
    rows.daily = [{ data: { date: disp, steps: "1", crunches: "1", planks: "1", pushups: "1", stretches: ["x"], breathSeconds: "300" } }];
    const res = await call({ method: "GET", query: { send: "pm" } }, async () => { throw new Error("should not send"); });
    assert.deepEqual({ sent: res.body.sent, skipped: res.body.skipped }, { sent: 0, skipped: 1 });
  });
  test("test=1 sends a hello to every device without reading logs", async () => {
    const sent = [];
    const res = await call({ method: "GET", query: { test: "1" } }, async (s, p) => sent.push(p));
    assert.equal(res.body.sent, 1);
    assert.match(sent[0].title, /reminders are on/i);
    assert.ok(!f.calls.some(c => c.url.includes("/workouts?")));
  });
  test("requires the passphrase or CRON_SECRET for everything except config", async () => {
    let res = mockRes();
    await pushHandler({ method: "GET", query: { send: "pm" }, headers: {} }, res, {});
    assert.equal(res.statusCode, 401);
    process.env.CRON_SECRET = "cron";
    res = mockRes();
    await pushHandler({ method: "GET", query: { test: "1" }, headers: { authorization: "Bearer cron" } }, res, { send: async () => {} });
    assert.equal(res.statusCode, 200);
  });
  test("missing VAPID keys is a clear 500", async () => {
    delete process.env.VAPID_PRIVATE_KEY;
    const res = await call({ method: "GET", query: { send: "pm" } });
    assert.equal(res.statusCode, 500);
    assert.match(res.body.error, /VAPID/);
  });
});
