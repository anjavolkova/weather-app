import { test } from "node:test";
import assert from "node:assert/strict";
import { weatherCodeLabel, isRainOrStorm } from "../src/weatherCodes.js";

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

test("isRainOrStorm: true for drizzle, rain, rain showers, and thunderstorms", () => {
  for (const code of [51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82, 95, 96, 99]) {
    assert.equal(isRainOrStorm(code), true, `expected code ${code} to be rain/storm`);
  }
});

test("isRainOrStorm: false for clear/cloudy, fog, and snow codes", () => {
  for (const code of [0, 1, 2, 3, 45, 48, 71, 73, 75, 77, 85, 86]) {
    assert.equal(isRainOrStorm(code), false, `expected code ${code} to not be rain/storm`);
  }
});

test("isRainOrStorm: false for missing/non-numeric code", () => {
  assert.equal(isRainOrStorm(null), false);
  assert.equal(isRainOrStorm(undefined), false);
});
