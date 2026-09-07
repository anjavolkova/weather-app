import { test } from "node:test";
import assert from "node:assert/strict";
import { entriesToCsv } from "../src/csv.js";

test("entriesToCsv: header row plus one row per entry", () => {
  const csv = entriesToCsv([
    { date: "2026-01-01", energy: 3, fog: 2, mood: 4, sleep: 3, trend: "stable", notes: "fine", pressureHpa: 1010, pressureSource: "Open-Meteo", kpIndex: 1.3, readingAsOf: "2026-01-01T08:00" },
  ]);
  const lines = csv.trim().split("\n");
  assert.equal(lines.length, 2);
  assert.equal(lines[0], "date,energy,fog,mood,sleep,trend,notes,pressureHpa,pressureSource,kpIndex,readingAsOf");
  assert.ok(lines[1].startsWith("2026-01-01,3,2,4,3,stable,fine,1010,Open-Meteo,1.3,"));
});

test("entriesToCsv: quotes fields containing commas or quotes", () => {
  const csv = entriesToCsv([{ date: "2026-01-02", notes: 'foggy, "heavy" day' }]);
  const lines = csv.trim().split("\n");
  assert.ok(lines[1].includes('"foggy, ""heavy"" day"'));
});

test("entriesToCsv: empty list produces just the header", () => {
  const csv = entriesToCsv([]);
  assert.equal(csv.trim(), "date,energy,fog,mood,sleep,trend,notes,pressureHpa,pressureSource,kpIndex,readingAsOf");
});
