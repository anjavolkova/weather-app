import { fetchHistoricalConditions } from "./weather.js";

/** Entries that don't yet have a weather condition logged. */
export function entriesMissingConditions(entries) {
  return entries.filter((e) => typeof e.weatherCode !== "number");
}

/** Earliest/latest date across a set of entries (assumes non-empty). */
export function dateRange(entries) {
  const dates = entries.map((e) => e.date).sort();
  return { startDate: dates[0], endDate: dates[dates.length - 1] };
}

/**
 * Fetches historical weather for the full date range spanning `entries` in
 * ONE archive API call (not one request per day), and returns
 * { date -> {weatherCode, condition, temperatureC} } for just those dates
 * that got a match — the archive API can lag a few days behind "today", so
 * very recent dates may come back missing; callers should skip those rather
 * than error (they'll be filled by that day's live save instead). Callers
 * are responsible for writing results back via upsertEntry.
 */
export async function fetchBackfillData(entries, latitude, longitude) {
  if (entries.length === 0) return {};
  const { startDate, endDate } = dateRange(entries);
  const byDate = await fetchHistoricalConditions(latitude, longitude, startDate, endDate);

  const result = {};
  for (const entry of entries) {
    if (byDate[entry.date]) result[entry.date] = byDate[entry.date];
  }
  return result;
}
