import { test, describe, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { runInNewContext } from "node:vm";
import { mockRes, stubFetch } from "./helpers.js";
import { isoDate, sortSessions, sessionsToCsv, sessionsToJson, buildExport } from "../src/export.js";
import exportHandler from "../api/export.js";

const legs = {
  id: 2, date: "7/15/2026", type: "legs",
  timing: { alarm: "05:45", gymArrival: "06:25", workoutEnd: "07:30", sauna: true },
  exercises: [
    { name: "Belt Squat", sets: [{ reps: "8", weight: "225" }, { reps: "8", weight: "315" }, { reps: "", weight: "" }] },
    { name: "Good Mornings, RDL style", sets: [{ reps: "10", weight: "225" }] },
    { name: "", sets: [{ reps: "5", weight: "5" }] },
  ],
};
const run = { id: 1, date: "6/30/2026", type: "run", runData: { distance: "3.1", duration: "27:10" } };
const pushups = { id: 3, date: "8/1/2026", type: "chest", exercises: [{ name: "Push-ups", sets: [{ reps: "20", weight: "" }] }] };

describe("export helpers", () => {
  test("isoDate converts the app's M/D/YYYY join key", () => {
    assert.equal(isoDate("8/5/2026"), "2026-08-05");
    assert.equal(isoDate("12/25/2026"), "2026-12-25");
    assert.equal(isoDate("garbage"), "garbage");
  });
  test("sortSessions keeps the newest copy of an id and sorts by date", () => {
    const out = sortSessions([{ ...legs, type: "old" }, pushups, run, legs]);
    assert.deepEqual(out.map(s => s.id), [1, 2, 3]);
    assert.equal(out[1].type, "legs");
  });
  test("CSV is one row per filled set, quotes commas, skips runs and blanks", () => {
    const lines = sessionsToCsv([run, legs, pushups]).trim().split("\n");
    assert.equal(lines[0], "date,session_id,type,exercise,set_number,reps,weight,alarm_set,arrived_gym,final_set,sauna");
    assert.deepEqual(lines.slice(1), [
      "2026-07-15,2,legs,Belt Squat,1,8,225,05:45,06:25,07:30,yes",
      "2026-07-15,2,legs,Belt Squat,2,8,315,05:45,06:25,07:30,yes",
      '2026-07-15,2,legs,"Good Mornings, RDL style",1,10,225,05:45,06:25,07:30,yes',
      "2026-08-01,3,chest,Push-ups,1,20,,,,,",
    ]);
  });
  test("JSON keeps runs and timing and turns set values into numbers", () => {
    const out = sessionsToJson([run, legs]);
    assert.deepEqual(out[0], { id: 1, date: "2026-06-30", type: "run", run: { distance: "3.1", duration: "27:10" } });
    assert.deepEqual(out[1].exercises[0].sets, [{ reps: 8, weight: 225 }, { reps: 8, weight: 315 }]);
    assert.equal(out[1].exercises.length, 2);
    assert.equal(out[1].timing.sauna, true);
  });
  test("buildExport reports what it produced", () => {
    const csv = buildExport([pushups, legs, run], "csv");
    assert.equal(csv.count, 4);
    assert.equal(csv.unit, "sets");
    assert.match(csv.filename, /^rep-workouts-\d{4}-\d{2}-\d{2}\.csv$/);
    const json = buildExport([pushups, legs, run], "json");
    assert.equal(json.count, 3);
    assert.equal(JSON.parse(json.text).sessions[0].id, 1);
  });
});

describe("/api/export", () => {
  let f;
  beforeEach(() => {
    process.env.APP_SECRET = "pass";
    process.env.SUPABASE_URL = "https://x.supabase.co";
    process.env.SUPABASE_SERVICE_KEY = "sb_secret_abc";
  });
  afterEach(() => f?.restore());
  const H = { "x-app-secret": "pass" };

  test("pages through Supabase and renders CSV inline as text by default", async () => {
    let call = 0;
    f = stubFetch([["/rest/v1/workouts", () => {
      call++;
      return call === 1 ? Array.from({ length: 1000 }, () => ({ data: run })) : [{ data: legs }];
    }]]);
    const res = mockRes();
    await exportHandler({ method: "GET", headers: H, query: { format: "csv", user_id: "user_x" } }, res);
    assert.equal(res.statusCode, 200);
    assert.equal(call, 2);
    assert.equal(f.calls[0].headers.Range, "0-999");
    assert.equal(f.calls[1].headers.Range, "1000-1999");
    assert.match(f.calls[0].url, /user_id=eq\.user_x/);
    assert.match(res.headers["Content-Type"], /^text\/plain/);
    assert.equal(res.headers["Content-Disposition"], undefined);
    assert.equal(res.body.trim().split("\n").length, 4); // header + 3 legs sets
  });
  test("a browser gets a copy/download page; raw=1 or non-browser clients get plain text", async () => {
    f = stubFetch([["/rest/v1/workouts", () => [{ data: legs }]]]);
    const browser = { accept: "text/html,application/xhtml+xml,*/*;q=0.8", "x-app-secret": "pass" };
    let res = mockRes();
    await exportHandler({ method: "GET", headers: browser, query: { format: "csv", s: "must-not-be-reflected" } }, res);
    assert.match(res.headers["Content-Type"], /^text\/html/);
    assert.match(res.body, /SAVE FILE/);
    assert.match(res.body, /COPY ALL/);
    assert.match(res.body, /URL.createObjectURL\(file\(\)\)/);
    assert.match(res.body, /download.download = NAME/);
    assert.ok(!res.body.includes("must-not-be-reflected"));
    assert.ok(!res.body.includes("/api/export?"));
    assert.equal(res.headers["Referrer-Policy"], "no-referrer");
    assert.match(res.body, /Good Mornings, RDL style/); // data is embedded for the buttons
    assert.ok(!/<textarea/.test(res.body), "no heavy textarea in the page");
    res = mockRes();
    await exportHandler({ method: "GET", headers: browser, query: { format: "csv", raw: "1" } }, res);
    assert.match(res.headers["Content-Type"], /^text\/plain/);
    res = mockRes();
    await exportHandler({ method: "GET", headers: { accept: "*/*", "x-app-secret": "pass" }, query: { format: "csv" } }, res);
    assert.match(res.headers["Content-Type"], /^text\/plain/);
    assert.equal(res.body.trim().split("\n").length, 4);
  });
  test("download=1 serves an attachment with the real MIME type", async () => {
    f = stubFetch([["/rest/v1/workouts", () => [{ data: legs }]]]);
    const res = mockRes();
    await exportHandler({ method: "GET", headers: H, query: { format: "csv", download: "1" } }, res);
    assert.match(res.headers["Content-Type"], /^text\/csv/);
    assert.match(res.headers["Content-Disposition"], /attachment; filename="rep-workouts-\d{4}-\d{2}-\d{2}\.csv"/);
  });
  test("the authenticated HTML export downloads its embedded data without another API request", async () => {
    f = stubFetch([["/rest/v1/workouts", () => [{ data: legs }]]]);
    const res = mockRes();
    await exportHandler({ method: "GET", headers: { ...H, accept: "text/html" }, query: {} }, res);
    const script = res.body.match(/<script>([\s\S]*?)<\/script>/)[1];
    let file, clicked = 0, cleanup;
    const elements = { dl: { click() { clicked++; } }, msg: {}, save: {}, copy: {} };
    runInNewContext(script, {
      File,
      URL: { createObjectURL(value) { file = value; return "blob:local-export"; }, revokeObjectURL() {} },
      document: { getElementById(id) { return elements[id]; } },
      navigator: {},
      window: { addEventListener(event, fn) { assert.equal(event, "pagehide"); cleanup = fn; } },
    });
    assert.equal(elements.dl.href, "blob:local-export");
    assert.match(elements.dl.download, /^rep-workouts-.*\.csv$/);
    assert.equal(await file.text(), buildExport([legs], "csv").text);
    elements.save.onclick();
    assert.equal(clicked, 1);
    assert.equal(typeof cleanup, "function");
    assert.equal(f.calls.length, 1);
  });
  test("json format wraps sessions with an export timestamp", async () => {
    f = stubFetch([["/rest/v1/workouts", () => [{ data: legs }]]]);
    const res = mockRes();
    await exportHandler({ method: "GET", headers: H, query: { format: "json" } }, res);
    const parsed = JSON.parse(res.body);
    assert.equal(parsed.sessions.length, 1);
    assert.ok(parsed.exportedAt);
    assert.match(res.headers["Content-Type"], /json/);
  });
  test("requires the passphrase", async () => {
    f = stubFetch([]);
    const res = mockRes();
    await exportHandler({ method: "GET", headers: {}, query: {} }, res);
    assert.equal(res.statusCode, 401);
    assert.equal(f.calls.length, 0);
  });
  test("a URL passphrase cannot download or render workout exports", async () => {
    f = stubFetch([]);
    for (const query of [{ s: "pass" }, { s: "pass", download: "1" }]) {
      const res = mockRes();
      await exportHandler({ method: "GET", headers: { accept: "text/html" }, query }, res);
      assert.equal(res.statusCode, 401);
    }
    assert.equal(f.calls.length, 0);
  });
});
