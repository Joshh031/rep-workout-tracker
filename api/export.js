// Export the user's workout history for outside analysis. Requires the
// passphrase like every other route (header or ?s=, so it works from a
// browser address bar / Share sheet).
//
// GET /api/export?format=csv   -> one row per set (strength sessions only)
// GET /api/export?format=json  -> every session, incl. runs and timing
// Optional: &user_id=...        -> otherwise every row in the table (single-user app)

import { checkAuth } from "./_auth.js";
import { supabaseConfig, supabaseHeaders } from "./_supabase.js";

const PAGE = 1000; // PostgREST's default max-rows

// "8/20/2026" -> "2026-08-20" so spreadsheets and pandas sort it correctly
export const isoDate = (mdy) => {
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(mdy || "");
  return m ? `${m[3]}-${m[1].padStart(2, "0")}-${m[2].padStart(2, "0")}` : (mdy || "");
};

const csvCell = (v) => {
  const s = v == null ? "" : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

// Newest copy of each session id, ordered oldest → newest
export function dedupeSessions(rows) {
  const byId = new Map();
  for (const r of rows) if (r.data?.id != null) byId.set(r.data.id, r.data);
  return [...byId.values()].sort((a, b) =>
    isoDate(a.date).localeCompare(isoDate(b.date)) || (a.id - b.id));
}

export function sessionsToCsv(sessions) {
  const header = ["date", "session_id", "type", "exercise", "set_number", "reps", "weight",
    "alarm_set", "arrived_gym", "final_set", "sauna"];
  const lines = [header.join(",")];
  for (const s of sessions) {
    if (!Array.isArray(s.exercises)) continue; // runs live in the JSON export
    const t = s.timing || {};
    for (const ex of s.exercises) {
      if (!ex?.name) continue;
      let n = 0;
      for (const set of ex.sets || []) {
        if (!set.reps && !set.weight) continue; // skip never-filled placeholder sets
        n++;
        lines.push([isoDate(s.date), s.id, s.type, ex.name, n, set.reps, set.weight,
          t.alarm, t.gymArrival, t.workoutEnd, t.sauna == null ? "" : (t.sauna ? "yes" : "no")]
          .map(csvCell).join(","));
      }
    }
  }
  return lines.join("\n") + "\n";
}

export function sessionsToJson(sessions) {
  return sessions.map(s => ({
    id: s.id,
    date: isoDate(s.date),
    type: s.type,
    ...(Array.isArray(s.exercises) ? {
      exercises: s.exercises.filter(e => e?.name).map(e => ({
        name: e.name,
        sets: (e.sets || []).filter(x => x.reps || x.weight).map(x => ({
          reps: x.reps === "" || x.reps == null ? null : Number(x.reps),
          weight: x.weight === "" || x.weight == null ? null : Number(x.weight),
        })),
      })),
    } : {}),
    ...(s.runData ? { run: s.runData } : {}),
    ...(s.timing ? { timing: s.timing } : {}),
  }));
}

export default async function handler(req, res) {
  if (!checkAuth(req, res)) return;
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  const { url: base, key } = supabaseConfig();
  if (!base || !key) return res.status(500).json({ error: "Supabase env vars not configured" });

  const q = req.query || {};
  const format = q.format === "json" ? "json" : "csv";
  const filter = q.user_id ? `&user_id=eq.${encodeURIComponent(q.user_id)}` : "";

  try {
    const rows = [];
    for (let from = 0; ; from += PAGE) {
      const r = await fetch(`${base}/rest/v1/workouts?select=data&order=created_at.asc${filter}`, {
        headers: { ...supabaseHeaders(key), Range: `${from}-${from + PAGE - 1}` },
      });
      if (!r.ok && r.status !== 206) throw new Error(`Supabase read failed (${r.status})`);
      const page = await r.json();
      rows.push(...page);
      if (page.length < PAGE) break;
    }
    const sessions = dedupeSessions(rows);
    const stamp = new Date().toISOString().slice(0, 10);
    res.status(200);
    res.setHeader("Cache-Control", "no-store");
    if (format === "json") {
      res.setHeader("Content-Type", "application/json");
      res.setHeader("Content-Disposition", `attachment; filename="rep-workouts-${stamp}.json"`);
      return res.send(JSON.stringify({ exportedAt: new Date().toISOString(), sessions: sessionsToJson(sessions) }, null, 2));
    }
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="rep-workouts-${stamp}.csv"`);
    return res.send(sessionsToCsv(sessions));
  } catch (e) {
    return res.status(502).json({ error: String(e.message || e) });
  }
}
