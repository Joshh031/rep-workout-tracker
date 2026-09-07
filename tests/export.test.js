import { test, describe, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { mockRes, stubFetch } from "./helpers.js";
import exportHandler, { isoDate, dedupeSessions, sessionsToCsv, sessionsToJson } from "../api/export.js";

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
  test("dedupeSessions keeps the newest copy of an id and sorts by date", () => {
    const rows = [{ data: { ...legs, type: "old" } }, { data: pushups }, { data: run }, { data: legs }];
    const out = dedupeSessions(rows);
    assert.deepEqual(out.map(s => s.id), [1, 2, 3]);
    assert.equal(out[1].type, "legs");
  });
  test("CSV is one row per filled set, quotes commas, skips runs and blanks", () => {
    const csv = sessionsToCsv([run, legs, pushups]);
    const lines = csv.trim().split("\n");
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
});

describe("/api/export", () => {
  let f;
  beforeEach(() => {
    process.env.APP_SECRET = "pass";
    process.env.SUPABASE_URL = "https://x.supabase.co";
    process.env.SUPABASE_SERVICE_KEY = "sb_secret_abc";
  });
  afterEach(() => f?.restore());

  test("pages through Supabase and returns a CSV attachment", async () => {
    let call = 0;
    f = stubFetch([["/rest/v1/workouts", () => {
      call++;
      // first page "full" (1000 rows of the same run), second page has the legs session
      return call === 1
        ? Array.from({ length: 1000 }, () => ({ data: run }))
        : [{ data: legs }];
    }]]);
    const res = mockRes();
    await exportHandler({ method: "GET", headers: { "x-app-secret": "pass" }, query: { format: "csv", user_id: "user_x" } }, res);
    assert.equal(res.statusCode, 200);
    assert.equal(call, 2);
    assert.equal(f.calls[0].headers.Range, "0-999");
    assert.equal(f.calls[1].headers.Range, "1000-1999");
    assert.match(f.calls[0].url, /user_id=eq\.user_x/);
    assert.match(res.headers["Content-Disposition"], /attachment; filename="rep-workouts-\d{4}-\d{2}-\d{2}\.csv"/);
    assert.equal(res.body.trim().split("\n").length, 4); // header + 3 legs sets
  });
  test("json format wraps sessions with an export timestamp", async () => {
    f = stubFetch([["/rest/v1/workouts", () => [{ data: legs }]]]);
    const res = mockRes();
    await exportHandler({ method: "GET", headers: { "x-app-secret": "pass" }, query: { format: "json" } }, res);
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
});
