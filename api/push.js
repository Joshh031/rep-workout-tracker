// Push reminders.
//
// GET  /api/push?config=1        -> { publicKey, enabled } (VAPID public key for the browser)
// POST /api/push  { subscription, user_id }  -> store a browser's push subscription
// DELETE /api/push { endpoint }  -> remove one
// GET  /api/push?send=am|pm      -> cron: send the reminder for that slot
//                                   (slot inferred from the local hour when omitted)
// GET  /api/push?test=1          -> send a test notification to every subscription now
//
// Subscriptions live in Supabase table push_subscriptions
//   (user_id text, data jsonb, created_at timestamptz default now()) — same
// shape as the app's other tables. Needs VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY
// (generate once with `npx web-push generate-vapid-keys`).

import webpush from "web-push";
import { checkAuth } from "./_auth.js";
import { supabaseConfig, supabaseHeaders } from "./_supabase.js";
import { buildReminder, localHour, localDay } from "./_reminders.js";

const TZ = process.env.REMINDER_TZ || "America/New_York";

// Returns the configured keys, or { error } when they're missing/malformed
function vapid() {
  const publicKey = process.env.VAPID_PUBLIC_KEY, privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) return { error: "VAPID keys not configured — add VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY in Vercel" };
  try {
    webpush.setVapidDetails(process.env.VAPID_SUBJECT || "mailto:rep@example.com", publicKey, privateKey);
    return { publicKey, privateKey };
  } catch (e) {
    return { error: `VAPID keys invalid: ${e.message}` };
  }
}

export default async function handler(req, res, deps = {}) {
  const send = deps.send || ((sub, payload) => webpush.sendNotification(sub, JSON.stringify(payload), { TTL: 6 * 3600 }));
  const q = req.query || {};
  const keys = vapid();
  res.setHeader("Cache-Control", "no-store");

  // Public: the browser needs the VAPID key before it can subscribe
  if (req.method === "GET" && q.config) {
    return res.status(200).json({ publicKey: keys.publicKey || null, enabled: !keys.error, ...(keys.error ? { error: keys.error } : {}) });
  }

  // Cron path: Vercel sends CRON_SECRET as a Bearer when set; otherwise the
  // app passphrase works too (for manual triggering from the browser).
  const isCron = process.env.CRON_SECRET && req.headers?.authorization === `Bearer ${process.env.CRON_SECRET}`;
  if (!isCron && !checkAuth(req, res)) return;

  const { url: base, key } = supabaseConfig();
  if (!base || !key) return res.status(500).json({ error: "Supabase env vars not configured" });
  const sb = async (path, init = {}) => {
    const r = await fetch(`${base}/rest/v1/${path}`, { ...init, headers: { ...supabaseHeaders(key), Prefer: "return=minimal", ...(init.headers || {}) } });
    if (!r.ok) throw new Error(`Supabase ${init.method || "GET"} ${path.split("?")[0]} failed (${r.status})`);
    return init.method && init.method !== "GET" ? null : r.json();
  };

  try {
    if (req.method === "POST") {
      const { subscription, user_id } = req.body || {};
      if (!subscription?.endpoint || !user_id) return res.status(400).json({ error: "subscription and user_id required" });
      // One row per endpoint: drop any older copy first
      await sb(`push_subscriptions?data->>endpoint=eq.${encodeURIComponent(subscription.endpoint)}`, { method: "DELETE" });
      await sb("push_subscriptions", { method: "POST", body: JSON.stringify({ user_id, data: subscription }) });
      return res.status(200).json({ ok: true });
    }
    if (req.method === "DELETE") {
      const { endpoint } = req.body || {};
      if (!endpoint) return res.status(400).json({ error: "endpoint required" });
      await sb(`push_subscriptions?data->>endpoint=eq.${encodeURIComponent(endpoint)}`, { method: "DELETE" });
      return res.status(200).json({ ok: true });
    }
    if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
    if (keys.error) return res.status(500).json({ error: keys.error });

    const subs = await sb("push_subscriptions?select=user_id,data");
    if (!subs.length) return res.status(200).json({ sent: 0, reason: "no subscriptions — enable reminders in the app" });

    // Decide the slot: explicit ?send=, else by local hour (cron runs at ~8am / ~8pm)
    const slot = q.test ? "test" : (q.send === "am" || q.send === "pm") ? q.send : (localHour(TZ) < 14 ? "am" : "pm");

    // Reminders are per user; load each user's recent logs once
    const byUser = new Map();
    for (const s of subs) (byUser.get(s.user_id) || byUser.set(s.user_id, []).get(s.user_id)).push(s.data);

    let sent = 0, skipped = 0, removed = 0;
    const detail = [];
    for (const [uid, endpoints] of byUser) {
      let payload;
      if (slot === "test") {
        payload = { title: "REP reminders are on", body: "You'll get a nudge at 8am and 8pm on days with something missing", tag: "rep-test" };
      } else {
        const u = encodeURIComponent(uid);
        // Only the dates the reminder looks at: today and yesterday
        const days = [localDay(TZ, 0), localDay(TZ, -1)].map(d => { const [y, m, dd] = d.split("-"); return `${+m}/${+dd}/${y}`; });
        const inList = `data->>date=in.(${days.map(d => `"${d}"`).join(",")})`;
        const [workouts, daily, sleep] = await Promise.all([
          sb(`workouts?user_id=eq.${u}&select=data&${inList}`),
          sb(`daily_logs?user_id=eq.${u}&select=data&${inList}&order=created_at.desc`),
          sb(`sleep_logs?user_id=eq.${u}&select=data&${inList}`),
        ]);
        payload = buildReminder(slot, { workouts: workouts.map(r => r.data), daily: daily.map(r => r.data), sleep: sleep.map(r => r.data) }, { tz: TZ });
      }
      if (!payload) { skipped += endpoints.length; detail.push({ user: uid, skipped: "nothing missing" }); continue; }
      for (const sub of endpoints) {
        try { await send(sub, payload); sent++; }
        catch (e) {
          // 404/410 = the browser unsubscribed (app removed, permission revoked): forget it
          if (e.statusCode === 404 || e.statusCode === 410) { await sb(`push_subscriptions?data->>endpoint=eq.${encodeURIComponent(sub.endpoint)}`, { method: "DELETE" }); removed++; }
          else detail.push({ user: uid, error: String(e.body || e.message || e) });
        }
      }
      detail.push({ user: uid, slot, title: payload.title, body: payload.body });
    }
    return res.status(200).json({ slot, sent, skipped, removed, detail });
  } catch (e) {
    return res.status(502).json({ error: String(e.message || e) });
  }
}
