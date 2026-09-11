import { test } from "node:test";
import assert from "node:assert/strict";
import { entriesMissingConditions, dateRange, fetchBackfillData } from "../src/backfillWeather.js";

test("entriesMissingConditions: filters to entries without a numeric weatherCode", () => {
  const entries = [
    { date: "2026-08-01", weatherCode: 3 },
    { date: "2026-08-02" },
    { date: "2026-08-03", weatherCode: null },
  ];
  const missing = entriesMissingConditions(entries);
  assert.deepEqual(missing.map((e) => e.date), ["2026-08-02", "2026-08-03"]);
});

test("dateRange: earliest and latest date, unsorted input", () => {
  const entries = [{ date: "2026-08-15" }, { date: "2026-08-01" }, { date: "2026-08-09" }];
  assert.deepEqual(dateRange(entries), { startDate: "2026-08-01", endDate: "2026-08-15" });
});

test("fetchBackfillData: empty entries never calls the network", async () => {
  let called = false;
  const originalFetch = global.fetch;
  global.fetch = async () => {
    called = true;
    return { ok: true, json: async () => ({}) };
  };
  try {
    const result = await fetchBackfillData([], 46, 14);
    assert.deepEqual(result, {});
    assert.equal(called, false);
  } finally {
    global.fetch = originalFetch;
  }
});

test("fetchBackfillData: one request spanning the range, mapped back by date, skipping unmatched dates", async () => {
  let requestedUrl = null;
  const originalFetch = global.fetch;
  global.fetch = async (url) => {
    requestedUrl = String(url);
    return {
      ok: true,
      json: async () => ({
        daily: {
          time: ["2026-08-01", "2026-08-02", "2026-08-03"],
          weather_code: [0, 61, 3],
          temperature_2m_max: [20, 15, 18],
          temperature_2m_min: [10, 9, 12],
        },
      }),
    };
  };

  try {
    const entries = [{ date: "2026-08-01" }, { date: "2026-08-03" }]; // 08-02 not requested
    const result = await fetchBackfillData(entries, 46, 14);

    assert.match(requestedUrl, /start_date=2026-08-01/);
    assert.match(requestedUrl, /end_date=2026-08-03/);

    assert.deepEqual(Object.keys(result).sort(), ["2026-08-01", "2026-08-03"]);
    assert.equal(result["2026-08-01"].condition, "Clear sky");
    assert.equal(result["2026-08-01"].temperatureC, 15);
    assert.equal(result["2026-08-03"].condition, "Overcast");
  } finally {
    global.fetch = originalFetch;
  }
});
