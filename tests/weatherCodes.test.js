import { test } from "node:test";
import assert from "node:assert/strict";
import { weatherCodeLabel } from "../src/weatherCodes.js";

test("weatherCodeLabel: maps known WMO codes", () => {
  assert.equal(weatherCodeLabel(0), "Clear sky");
  assert.equal(weatherCodeLabel(3), "Overcast");
  assert.equal(weatherCodeLabel(61), "Slight rain");
  assert.equal(weatherCodeLabel(95), "Thunderstorm");
});

test("weatherCodeLabel: falls back gracefully for an unrecognized numeric code", () => {
  assert.equal(weatherCodeLabel(12), "Unknown (code 12)");
});

test("weatherCodeLabel: returns null for a missing/non-numeric code", () => {
  assert.equal(weatherCodeLabel(null), null);
  assert.equal(weatherCodeLabel(undefined), null);
});
