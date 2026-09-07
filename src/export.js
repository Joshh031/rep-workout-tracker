// Workout export helpers, shared by the app (share/copy from the History
// tab) and /api/export (link-based download). Pure functions, no I/O.

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
export function sortSessions(sessions) {
  const byId = new Map();
  for (const s of sessions) if (s?.id != null) byId.set(s.id, s);
  return [...byId.values()].sort((a, b) =>
    isoDate(a.date).localeCompare(isoDate(b.date)) || (a.id - b.id));
}

export const CSV_HEADER = ["date", "session_id", "type", "exercise", "set_number", "reps", "weight",
  "alarm_set", "arrived_gym", "final_set", "sauna"];

// One row per filled set; strength sessions only (runs live in the JSON export)
export function sessionsToCsv(sessions) {
  const lines = [CSV_HEADER.join(",")];
  for (const s of sessions) {
    if (!Array.isArray(s.exercises)) continue;
    const t = s.timing || {};
    for (const ex of s.exercises) {
      if (!ex?.name) continue;
      let n = 0;
      for (const set of ex.sets || []) {
        if (!set.reps && !set.weight) continue; // never-filled placeholder sets
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
  const num = (v) => (v === "" || v == null ? null : Number(v));
  return sessions.map(s => ({
    id: s.id,
    date: isoDate(s.date),
    type: s.type,
    ...(Array.isArray(s.exercises) ? {
      exercises: s.exercises.filter(e => e?.name).map(e => ({
        name: e.name,
        sets: (e.sets || []).filter(x => x.reps || x.weight).map(x => ({ reps: num(x.reps), weight: num(x.weight) })),
      })),
    } : {}),
    ...(s.runData ? { run: s.runData } : {}),
    ...(s.timing ? { timing: s.timing } : {}),
  }));
}

// Text + filename + MIME for a given format
export function buildExport(sessions, format) {
  const sorted = sortSessions(sessions);
  const stamp = new Date().toISOString().slice(0, 10);
  if (format === "json") {
    return {
      text: JSON.stringify({ exportedAt: new Date().toISOString(), sessions: sessionsToJson(sorted) }, null, 2),
      filename: `rep-workouts-${stamp}.json`, mime: "application/json",
      count: sorted.length, unit: "sessions",
    };
  }
  const text = sessionsToCsv(sorted);
  return { text, filename: `rep-workouts-${stamp}.csv`, mime: "text/csv", count: text.trim().split("\n").length - 1, unit: "sets" };
}
