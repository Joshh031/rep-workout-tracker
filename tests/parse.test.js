import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { parseWorkoutText } from "../src/parse.js";

describe("parseWorkoutText", () => {
  test("expands NxRxW into individual sets", () => {
    const r = parseWorkoutText("Bayesian cable curls 4x8x17.5");
    assert.equal(r.exercises.length, 1);
    assert.equal(r.exercises[0].name, "Bayesian cable curls");
    assert.equal(r.exercises[0].sets.length, 4);
    assert.deepEqual(r.exercises[0].sets[0], { reps: "8", weight: "17.5" });
  });
  test("keeps every set across ; and , groups (the case the LLM dropped)", () => {
    const r = parseWorkoutText([
      "Bayesian cable curls 4x8x17.5",
      "Seated hammer curls 4x8x25; 3x8x30",
      "Preacher curls 3x10x60, 3x8x70",
    ].join("\n"));
    const counts = r.exercises.map(e => e.sets.length);
    assert.deepEqual(counts, [4, 7, 6]);
    assert.equal(r.exercises[1].sets[4].weight, "30");
  });
  test("bodyweight lines leave weight blank", () => {
    const r = parseWorkoutText("Push-ups 3x12");
    assert.deepEqual(r.exercises[0].sets, [{ reps: "12", weight: "" }, { reps: "12", weight: "" }, { reps: "12", weight: "" }]);
  });
  test("accepts × and a trailing colon after the name", () => {
    const r = parseWorkoutText("Bench: 3×5×185");
    assert.equal(r.exercises[0].name, "Bench");
    assert.equal(r.exercises[0].sets.length, 3);
    assert.equal(r.exercises[0].sets[0].weight, "185");
  });
  test("returns null for freeform text so the LLM can take over", () => {
    assert.equal(parseWorkoutText("did some curls and felt strong"), null);
    assert.equal(parseWorkoutText("Curls 4x8x20\nthen a few sets of hammers"), null);
    assert.equal(parseWorkoutText(""), null);
    assert.equal(parseWorkoutText(undefined), null);
  });
  test("rejects implausible set counts", () => {
    assert.equal(parseWorkoutText("Curls 25x8x20"), null);
    assert.equal(parseWorkoutText("Curls 0x8x20"), null);
  });
});
