#!/usr/bin/env node
/**
 * One-time migration: fills in weather condition + temperature for entries
 * logged before that data was tracked. Fetches the whole missing date range
 * in a single call to Open-Meteo's historical archive API (not one request
 * per day), then writes each matched day back via upsertEntry. Safe to
 * re-run — only touches entries that still have no weatherCode.
 *
 * Usage: node scripts/backfill-weather.js
 */
import { getAllEntries, upsertEntry } from "../src/store.js";
import { resolveLocation } from "../src/reading.js";
import { entriesMissingConditions, fetchBackfillData } from "../src/backfillWeather.js";

const missing = entriesMissingConditions(getAllEntries());

if (missing.length === 0) {
  console.log("Every logged entry already has a weather condition — nothing to backfill.");
  process.exit(0);
}

console.log(`Backfilling weather conditions for ${missing.length} day(s)...`);

try {
  const config = await resolveLocation();
  const byDate = await fetchBackfillData(missing, config.latitude, config.longitude);

  let updated = 0;
  for (const entry of missing) {
    const conditions = byDate[entry.date];
    if (!conditions) continue;
    upsertEntry(entry.date, conditions);
    updated++;
    console.log(`  ${entry.date}: ${conditions.condition}, ${conditions.temperatureC}°C`);
  }

  const skipped = missing.length - updated;
  console.log(`Done — updated ${updated} day(s).`);
  if (skipped > 0) {
    console.log(
      `${skipped} day(s) had no historical data yet (usually the most recent few days — the archive lags behind "today"; they'll fill in from a live save instead).`
    );
  }
  process.exit(0);
} catch (err) {
  console.error("Backfill failed:", err.message);
  process.exit(1);
}
