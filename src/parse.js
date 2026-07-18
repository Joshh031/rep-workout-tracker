// Deterministic parser for structured workout text like:
//   Bayesian cable curls 4x8x17.5
//   Seated hammer curls 4x8x25; 3x8x30
//   Push-ups 3x12
// Grammar per line: <name> <N>x<reps>[x<weight>] [;|, <N>x<reps>[x<weight>] ...]
// Returns { exercises } only when EVERY non-empty line parses cleanly;
// otherwise null so the caller can fall back to the LLM for freeform text.

const GROUP_RE = /^(\d{1,2})\s*[x×]\s*(\d{1,3})(?:\s*[x×]\s*(\d{1,4}(?:\.\d+)?))?$/;

export function parseWorkoutText(text) {
  const lines = (text || "").split("\n").map(l => l.trim()).filter(Boolean);
  if (!lines.length) return null;

  const exercises = [];
  for (const line of lines) {
    // Split into name + the first "NxR..." token onward
    const m = line.match(/^(.+?)[:\s]+(\d{1,2}\s*[x×].+)$/);
    if (!m) return null;
    const name = m[1].replace(/[-–—:]+$/, "").trim();
    const groups = m[2].split(/[;,]/).map(g => g.trim()).filter(Boolean);
    if (!name || !groups.length) return null;

    const sets = [];
    for (const g of groups) {
      const gm = g.match(GROUP_RE);
      if (!gm) return null;
      const count = parseInt(gm[1], 10);
      if (!count || count > 20) return null;
      for (let i = 0; i < count; i++) {
        sets.push({ reps: gm[2], weight: gm[3] != null ? gm[3] : "" });
      }
    }
    exercises.push({ name, sets });
  }
  return { exercises };
}
