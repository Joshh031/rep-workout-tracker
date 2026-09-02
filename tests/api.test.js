import { test, describe, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { mockRes, stubFetch } from "./helpers.js";
import { checkAuth } from "../api/_auth.js";
import { supabaseHeaders } from "../api/_supabase.js";
import dataHandler from "../api/data.js";
import claudeHandler from "../api/claude.js";

const H = { "x-app-secret": "pass" };

describe("checkAuth", () => {
  test("500 when APP_SECRET is unset (misconfiguration, not a bad login)", () => {
    delete process.env.APP_SECRET;
    const res = mockRes();
    assert.equal(checkAuth({ headers: {}, query: {} }, res), false);
    assert.equal(res.statusCode, 500);
  });
  test("401 on mismatch, true on header or ?s= match", () => {
    process.env.APP_SECRET = "pass";
    const bad = mockRes();
    assert.equal(checkAuth({ headers: { "x-app-secret": "nope" }, query: {} }, bad), false);
    assert.equal(bad.statusCode, 401);
    assert.equal(checkAuth({ headers: H, query: {} }, mockRes()), true);
    assert.equal(checkAuth({ headers: {}, query: { s: "pass" } }, mockRes()), true);
  });
});

describe("supabaseHeaders", () => {
  test("new sb_secret keys go in apikey only; legacy JWTs also get a bearer", () => {
    assert.deepEqual(Object.keys(supabaseHeaders("sb_secret_x")).sort(), ["Content-Type", "apikey"]);
    const legacy = supabaseHeaders("eyJabc");
    assert.equal(legacy.Authorization, "Bearer eyJabc");
    assert.equal(legacy.apikey, "eyJabc");
  });
});

describe("/api/data", () => {
  let f;
  beforeEach(() => {
    process.env.APP_SECRET = "pass";
    process.env.SUPABASE_URL = "https://x.supabase.co";
    process.env.SUPABASE_SERVICE_KEY = "sb_secret_abc";
    f = stubFetch([["supabase", () => ({ ok: true, status: 200, text: async () => '[{"data":{"id":1}}]' })]]);
  });
  afterEach(() => f.restore());

  test("rejects unknown tables and methods", async () => {
    let res = mockRes();
    await dataHandler({ method: "GET", headers: H, query: { table: "users" } }, res);
    assert.equal(res.statusCode, 400);
    res = mockRes();
    await dataHandler({ method: "PUT", headers: H, query: { table: "workouts" } }, res);
    assert.equal(res.statusCode, 405);
    assert.equal(f.calls.length, 0);
  });
  test("passes only allowlisted PostgREST params through", async () => {
    const res = mockRes();
    await dataHandler({ method: "GET", headers: H, query: { table: "workouts", user_id: "eq.user_x", order: "created_at.desc", select: "user_id", limit: "5" } }, res);
    assert.equal(res.statusCode, 200);
    const url = new URL(f.calls[0].url);
    assert.equal(url.pathname, "/rest/v1/workouts");
    assert.equal(url.searchParams.get("user_id"), "eq.user_x");
    assert.equal(url.searchParams.get("limit"), "5");
    assert.equal(url.searchParams.get("select"), null);
    assert.equal(res.body, '[{"data":{"id":1}}]');
  });
  test("POST asks for the created row back; PATCH scopes by user and id", async () => {
    let res = mockRes();
    await dataHandler({ method: "POST", headers: H, query: { table: "sleep_logs" }, body: { user_id: "u", data: { id: 1 } } }, res);
    assert.equal(f.calls[0].headers.Prefer, "return=representation");
    assert.deepEqual(f.calls[0].body, { user_id: "u", data: { id: 1 } });
    res = mockRes();
    await dataHandler({ method: "PATCH", headers: H, query: { table: "sleep_logs", user_id: "eq.u", "data->>id": "eq.1" }, body: { data: { id: 1, x: 2 } } }, res);
    assert.match(f.calls[1].url, /data-%3E%3Eid=eq\.1|data->>id=eq\.1/);
    assert.equal(f.calls[1].headers.Prefer, "return=minimal");
  });
  test("a 401 from the passphrase never reaches Supabase", async () => {
    const res = mockRes();
    await dataHandler({ method: "GET", headers: { "x-app-secret": "wrong" }, query: { table: "workouts" } }, res);
    assert.equal(res.statusCode, 401);
    assert.equal(f.calls.length, 0);
  });
});

describe("/api/claude", () => {
  let f;
  beforeEach(() => {
    process.env.APP_SECRET = "pass";
    process.env.ANTHROPIC_API_KEY = "sk-test";
    f = stubFetch([["anthropic", () => ({ ok: true, status: 200, text: async () => '{"content":[]}' })]]);
  });
  afterEach(() => f.restore());

  test("only the allowlisted model gets through", async () => {
    const res = mockRes();
    await claudeHandler({ method: "POST", headers: H, body: { model: "claude-sonnet-4-20250514", max_tokens: 10, messages: [] } }, res);
    assert.equal(res.statusCode, 400);
    assert.equal(f.calls.length, 0);
  });
  test("clamps max_tokens and forwards with the server-side key", async () => {
    const res = mockRes();
    await claudeHandler({ method: "POST", headers: H, body: { model: "claude-sonnet-4-6", max_tokens: 99999, messages: [] } }, res);
    assert.equal(res.statusCode, 200);
    assert.equal(f.calls[0].body.max_tokens, 2000);
    assert.equal(f.calls[0].headers["x-api-key"], "sk-test");
    assert.equal(res.headers["Cache-Control"], "no-store");
  });
  test("GET is not allowed", async () => {
    const res = mockRes();
    await claudeHandler({ method: "GET", headers: H }, res);
    assert.equal(res.statusCode, 405);
  });
});
