// Exercise-name normalization and session-comparison helpers.

// Irregular plurals / spelling variants a trailing-"s" strip can't catch.
// Add a row here when two spellings of the same lift should compare equal.
export const NAME_VARIANTS = {
  flies: "fly", flyes: "fly", flys: "fly",
  // "-es" plurals the trailing-s strip would mangle ("crunches" → "crunche")
  crunches: "crunch", benches: "bench", presses: "press", pushes: "push",
  // irregular
  calves: "calf",
};

const foldWord = (w) => {
  w = NAME_VARIANTS[w] || w;
  // Strip a single trailing "s" to fold plurals; skip short words ("abs")
  // and "…ss" endings ("press").
  return (w.length > 3 && w.endsWith("s") && !w.endsWith("ss")) ? w.slice(0, -1) : w;
};

const words = (name) => !name ? [] : name.toLowerCase()
  .replace(/[-_]/g, " ")
  .replace(/[^\w\s]/g, "")
  .split(/\s+/)
  .filter(Boolean)
  .map(foldWord);

// Normalize a name to a comparison key: case/punctuation/plural/spacing
// folded, so "Push-Up"/"push ups" and "Shrug"/"Shrugs" collapse together.
// Display data keeps the original spelling.
export function normalizeName(name) {
  return words(name).join("");
}

export function nameTokens(name) {
  return new Set(words(name));
}

// One name's words fully inside the other's — "hamstring curl" ⊂
// "hamstring leg curl", "calf" ⊂ "calf extension seated".
function contains(a, b) {
  const [small, big] = a.size <= b.size ? [a, b] : [b, a];
  if (small.size === 0) return false;
  for (const t of small) if (!big.has(t)) return false;
  return true;
}

const jaccard = (a, b) => {
  let n = 0;
  for (const t of a) if (b.has(t)) n++;
  return n / (a.size + b.size - n);
};

// Find the exercise in a previous session's list that corresponds to `name`.
// Exact normalized match wins; otherwise the best word-containment match.
// Pass a shared `claimed` Set when matching a whole session so two of
// today's exercises can't both map to the same previous one (keeps
// "Leg press" from stealing "Leg press calves"' counterpart).
export function findLastMatch(name, lastExercises, claimed) {
  const key = normalizeName(name);
  if (!key || !lastExercises?.length) return null;
  let idx = lastExercises.findIndex((e, i) => !(claimed?.has(i)) && normalizeName(e.name) === key);
  if (idx === -1) {
    const mine = nameTokens(name);
    let bestScore = 0;
    lastExercises.forEach((e, i) => {
      if (claimed?.has(i)) return;
      const theirs = nameTokens(e.name);
      if (!contains(mine, theirs)) return;
      const s = jaccard(mine, theirs);
      if (s > bestScore) { bestScore = s; idx = i; }
    });
  }
  if (idx === -1) return null;
  claimed?.add(idx);
  return lastExercises[idx];
}

const maxOf = (sets, f) => sets.reduce((m, s) => Math.max(m, parseFloat(s[f]) || 0), 0);
const volOf = (sets) => sets.reduce((a, s) => a + (parseFloat(s.weight) || 0) * (parseFloat(s.reps) || 0), 0);

// Compare today's filled sets against last time's.
//   "weight" — heavier top set
//   "reps"   — more reps at the same top weight
//   "volume" — same top set, but more total volume (e.g. an extra set)
//   "tied"   — held last time's numbers
//   "behind" — lighter top set, or fewer reps at the same weight
//   "new"    — nothing to compare against
export function compareSets(todaySets, lastSets) {
  const t = { maxW: maxOf(todaySets, "weight"), maxR: maxOf(todaySets, "reps"), vol: volOf(todaySets) };
  const l = { maxW: maxOf(lastSets, "weight"), maxR: maxOf(lastSets, "reps"), vol: volOf(lastSets) };
  let status;
  if (!lastSets.length) status = "new";
  else if (t.maxW > l.maxW) status = "weight";
  else if (t.maxW === l.maxW && t.maxR > l.maxR) status = "reps";
  else if (t.maxW === l.maxW && t.maxR === l.maxR && t.vol > l.vol) status = "volume";
  else if (t.maxW === l.maxW && t.maxR >= l.maxR) status = "tied";
  else status = "behind";
  return { status, todayMaxW: t.maxW, lastMaxW: l.maxW, todayMaxR: t.maxR, lastMaxR: l.maxR };
}
