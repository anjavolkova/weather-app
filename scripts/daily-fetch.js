#!/usr/bin/env node
/**
 * Standalone entrypoint for an OS-level cron/launchd job, for machines where
 * the server isn't kept running continuously. Fetches today's pressure +
 * Kp-index and pre-fills the day's entry. See README.md for setup.
 *
 * Usage: node scripts/daily-fetch.js
 * Cron:  0 7 * * *  cd /path/to/weather-app && node scripts/daily-fetch.js >> data/fetch.log 2>&1
 */
import { fetchLiveReading, todayIso } from "../src/reading.js";

const date = process.argv[2] || todayIso();

try {
  const { entry, alerts } = await fetchLiveReading(date);
  console.log(
    `[${new Date().toISOString()}] Logged ${date}: ${entry.pressureHpa} hPa (${entry.trend}), Kp ${entry.kpIndex}`
  );
  for (const alert of alerts) console.log(`  ALERT (${alert.type}): ${alert.message}`);
  process.exit(0);
} catch (err) {
  console.error(`[${new Date().toISOString()}] daily-fetch failed for ${date}:`, err.message);
  process.exit(1);
}
