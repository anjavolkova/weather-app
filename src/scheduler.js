import cron from "node-cron";
import { fetchLiveReading, todayIso } from "./reading.js";

/**
 * In-process daily auto-log, for whenever the server itself is left running.
 * Runs at 07:00 local time and pre-fills the day's pressure + Kp reading so
 * the only manual step left is the symptom sliders. Disable with
 * AUTO_FETCH_CRON=off; override the time with AUTO_FETCH_CRON="m h * * *".
 *
 * For a machine where the server isn't kept running continuously, use
 * `npm run fetch-today` (scripts/daily-fetch.js) from an OS cron/launchd job
 * instead — see README.md.
 */
export function startScheduler() {
  const expr = process.env.AUTO_FETCH_CRON;
  if (expr === "off") return;
  const schedule = expr || "0 7 * * *";

  if (!cron.validate(schedule)) {
    console.warn(`AUTO_FETCH_CRON="${schedule}" is not a valid cron expression; scheduler disabled`);
    return;
  }

  cron.schedule(schedule, async () => {
    const date = todayIso();
    try {
      const { entry, alerts } = await fetchLiveReading(date);
      console.log(`[scheduler] auto-logged reading for ${date}: ${entry.pressureHpa} hPa, Kp ${entry.kpIndex}`);
      for (const alert of alerts) console.log(`[scheduler] ALERT: ${alert.message}`);
    } catch (err) {
      console.error(`[scheduler] auto-fetch failed for ${date}:`, err.message);
    }
  });
  console.log(`[scheduler] daily auto-fetch armed: "${schedule}"`);
}
