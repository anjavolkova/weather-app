import { test } from "node:test";
import assert from "node:assert/strict";
import { computeTrend } from "../src/trend.js";

test("rising when pressure climbs more than 1.5 hPa", () => {
  assert.equal(computeTrend(1010, 1008), "rising");
});

test("falling when pressure drops more than 1.5 hPa", () => {
  assert.equal(computeTrend(1005, 1008), "falling");
});

test("stable for small changes", () => {
  assert.equal(computeTrend(1008.5, 1008), "stable");
  assert.equal(computeTrend(1006.6, 1008), "stable");
});

test("boundary values are stable, not rising/falling", () => {
  assert.equal(computeTrend(1009.5, 1008), "stable");
  assert.equal(computeTrend(1006.5, 1008), "stable");
});

test("unsure with no prior reading", () => {
  assert.equal(computeTrend(1008, undefined), "unsure");
  assert.equal(computeTrend(1008, null), "unsure");
});
