import { test } from "node:test";
import assert from "node:assert/strict";
import { pearson, fogCorrelations, avgFogByTrend, recentSeries } from "../src/stats.js";

test("pearson: perfect positive correlation", () => {
  const r = pearson([1, 2, 3, 4, 5], [2, 4, 6, 8, 10]);
  assert.ok(Math.abs(r - 1) < 1e-9);
});

test("pearson: perfect negative correlation", () => {
  const r = pearson([1, 2, 3, 4, 5], [10, 8, 6, 4, 2]);
  assert.ok(Math.abs(r - -1) < 1e-9);
});

test("pearson: no variance returns null", () => {
  assert.equal(pearson([3, 3, 3], [1, 2, 3]), null);
});

test("pearson: fewer than 2 points returns null", () => {
  assert.equal(pearson([1], [1]), null);
});

function makeEntries(n, fn) {
  return Array.from({ length: n }, (_, i) => ({ date: `2026-01-${String(i + 1).padStart(2, "0")}`, ...fn(i) }));
}

test("fogCorrelations: null r below the minimum point threshold", () => {
  const entries = makeEntries(4, (i) => ({ fog: i + 1, energy: 5 - i }));
  const { energy } = fogCorrelations(entries);
  assert.equal(energy.r, null);
  assert.equal(energy.n, 4);
});

test("fogCorrelations: computes r once >=5 paired points exist", () => {
  const entries = makeEntries(6, (i) => ({ fog: i + 1, energy: i + 1 }));
  const { energy } = fogCorrelations(entries);
  assert.ok(energy.r > 0.9);
  assert.equal(energy.n, 6);
});

test("fogCorrelations: ignores entries missing either value", () => {
  const entries = [
    { date: "2026-01-01", fog: 3, energy: 2 },
    { date: "2026-01-02", fog: 4 },
    { date: "2026-01-03", energy: 5 },
    { date: "2026-01-04", fog: 2, energy: 4 },
    { date: "2026-01-05", fog: 5, energy: 1 },
    { date: "2026-01-06", fog: 1, energy: 5 },
  ];
  const { energy } = fogCorrelations(entries);
  assert.equal(energy.n, 4);
});

test("avgFogByTrend: groups and averages correctly", () => {
  const entries = [
    { date: "2026-01-01", fog: 2, trend: "rising" },
    { date: "2026-01-02", fog: 4, trend: "rising" },
    { date: "2026-01-03", fog: 3, trend: "falling" },
  ];
  const result = avgFogByTrend(entries);
  assert.equal(result.rising.avg, 3);
  assert.equal(result.rising.n, 2);
  assert.equal(result.falling.avg, 3);
  assert.equal(result.stable.avg, null);
});

test("recentSeries: returns at most `days` most recent entries in date order", () => {
  const entries = makeEntries(35, (i) => ({ fog: 3, energy: 3 }));
  const series = recentSeries(entries, 30);
  assert.equal(series.length, 30);
  assert.equal(series[0].date, entries[5].date);
  assert.equal(series.at(-1).date, entries.at(-1).date);
});
