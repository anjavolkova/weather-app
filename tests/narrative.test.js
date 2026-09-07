import { test } from "node:test";
import assert from "node:assert/strict";
import { generateNarrative } from "../src/narrative.js";

test("generateNarrative: no entries", () => {
  const result = generateNarrative([]);
  assert.equal(result.headline, "No entries yet");
  assert.equal(result.stats.length, 0);
});

test("generateNarrative: below the insight threshold still reports basic stats", () => {
  const entries = [
    { date: "2026-01-01", fog: 3, kpIndex: 1 },
    { date: "2026-01-02", fog: 4, kpIndex: 2 },
  ];
  const result = generateNarrative(entries);
  assert.match(result.headline, /2 days logged/);
  assert.equal(result.stats.find((s) => s.label === "Average fog").value, "3.5/5");
  assert.match(result.paragraphs[0], /Log 3 more days/);
});

test("generateNarrative: singular day/wording", () => {
  const result = generateNarrative([{ date: "2026-01-01", fog: 3 }]);
  assert.match(result.headline, /^1 day logged/);
  assert.match(result.paragraphs[0], /Log 4 more days/);
});

function makeEntries() {
  const entries = [];
  for (let i = 0; i < 10; i++) {
    const date = `2026-01-${String(i + 1).padStart(2, "0")}`;
    entries.push({
      date,
      fog: i < 5 ? 5 : 1, // strong split between two halves
      energy: i < 5 ? 1 : 5,
      trend: i < 5 ? "falling" : "rising",
      kpIndex: i === 2 ? 6.5 : 1.2,
    });
  }
  return entries;
}

test("generateNarrative: identifies the strongest correlation", () => {
  const result = generateNarrative(makeEntries());
  assert.match(result.paragraphs[0], /correlation with energy/);
  assert.match(result.paragraphs[0], /r = -1\.00/);
});

test("generateNarrative: compares fog across pressure trend groups", () => {
  const result = generateNarrative(makeEntries());
  assert.ok(result.paragraphs.some((p) => /falling-pressure days/.test(p) || /rising-pressure days/.test(p)));
});

test("generateNarrative: counts geomagnetic storm days", () => {
  const result = generateNarrative(makeEntries());
  assert.equal(result.stats.find((s) => s.label === "Storm days (Kp ≥ 5)").value, "1");
  assert.ok(result.paragraphs.some((p) => /1 geomagnetic storm day/.test(p)));
});

test("generateNarrative: reports the foggiest and clearest days, latest date breaking ties", () => {
  const result = generateNarrative(makeEntries());
  assert.equal(result.stats.find((s) => s.label === "Foggiest day").value, "2026-01-05 (5/5)");
  assert.ok(result.paragraphs.some((p) => p.includes("clearest day was 2026-01-10")));
});
