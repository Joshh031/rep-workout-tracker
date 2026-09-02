import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { normalizeName, findLastMatch, compareSets } from "../src/compare.js";

const sets = (...pairs) => pairs.map(([reps, weight]) => ({ reps: String(reps), weight: weight == null ? "" : String(weight) }));
const rep = (n, reps, weight) => Array.from({ length: n }, () => ({ reps: String(reps), weight: String(weight) }));

describe("normalizeName", () => {
  test("folds plurals, case, punctuation and spacing", () => {
    assert.equal(normalizeName("Shrugs"), normalizeName("shrug"));
    assert.equal(normalizeName("Push-Ups"), normalizeName("push ups"));
    assert.equal(normalizeName("Leg Presses"), normalizeName("leg press"));
    assert.equal(normalizeName("Good Mornings"), normalizeName("good morning"));
  });
  test("handles irregular variants", () => {
    assert.equal(normalizeName("Flies"), normalizeName("Fly"));
    assert.equal(normalizeName("Flyes"), normalizeName("Fly"));
    assert.equal(normalizeName("Calves"), normalizeName("calf"));
    assert.equal(normalizeName("Crunches"), normalizeName("crunch"));
  });
  test("leaves short words and -ss endings alone", () => {
    assert.equal(normalizeName("abs"), "abs");
    assert.equal(normalizeName("press"), "press");
    assert.notEqual(normalizeName("Bench press"), normalizeName("Bench"));
  });
});

describe("findLastMatch", () => {
  const last = [{ name: "Leg press calves" }, { name: "Shrugs" }, { name: "Hamstring leg curl" }];
  test("matches an exact normalized name first", () => {
    assert.equal(findLastMatch("shrug", last)?.name, "Shrugs");
  });
  test("falls back to word containment", () => {
    assert.equal(findLastMatch("Hamstring curl", last)?.name, "Hamstring leg curl");
    assert.equal(findLastMatch("Calves", last)?.name, "Leg press calves");
  });
  test("a shared claimed set stops two exercises mapping to one", () => {
    const prev = [{ name: "Leg press" }];
    const claimed = new Set();
    assert.equal(findLastMatch("Leg press", prev, claimed)?.name, "Leg press");
    assert.equal(findLastMatch("Leg press calves", prev, claimed), null);
  });
  test("returns null for unrelated names and empty input", () => {
    assert.equal(findLastMatch("Bench", last), null);
    assert.equal(findLastMatch("", last), null);
    assert.equal(findLastMatch("Shrugs", []), null);
  });
});

describe("compareSets — strict ladder", () => {
  test("matching last session exactly is tied, not a PR", () => {
    // belt squat: 2x8x225 + 3x8x315 both days
    const today = [...rep(2, 8, 225), ...rep(3, 8, 315)];
    assert.equal(compareSets(today, [...rep(2, 8, 225), ...rep(3, 8, 315)]).status, "tied");
  });
  test("fewer reps at the same top weight is behind", () => {
    assert.equal(compareSets(sets([8, 225]), sets([10, 225])).status, "behind");
  });
  test("lighter top set is behind even with more volume", () => {
    assert.equal(compareSets(rep(5, 10, 200), sets([5, 225])).status, "behind");
  });
  test("heavier top set is a weight PR", () => {
    const r = compareSets(sets([8, 225], [6, 335]), sets([8, 225], [8, 315]));
    assert.equal(r.status, "weight");
    assert.equal(r.todayMaxW, 335);
    assert.equal(r.lastMaxW, 315);
  });
  test("more reps at the same weight is a rep PR", () => {
    assert.equal(compareSets(sets([10, 225]), sets([8, 225])).status, "reps");
  });
  test("same top set with an extra set is a volume gain", () => {
    assert.equal(compareSets(rep(4, 8, 225), rep(3, 8, 225)).status, "volume");
  });
  test("bodyweight work compares on reps", () => {
    assert.equal(compareSets(sets([12, null]), sets([10, null])).status, "reps");
    assert.equal(compareSets(sets([10, null]), sets([10, null])).status, "tied");
  });
  test("nothing to compare against is new", () => {
    assert.equal(compareSets(sets([10, 100]), []).status, "new");
  });
});
