import cron from "node-cron";
import { fetchLiveReading, todayIso } from "./reading.js";
import { getAllEntries, getMonthlySummary, saveMonthlySummary } from "./store.js";
import { entriesForMonth, monthLabel } from "./stats.js";
import { generateNarrative } from "./narrative.js";
import { generateAiSummary } from "./aiSummary.js";

const MIN_ENTRIES_FOR_AUTO_SUMMARY = 5;

function previousMonthKey(dateIso) {
  const [y, m] = dateIso.split("-").map(Number);
  const d = new Date(y, m - 2, 1); // JS Date months are 0-based, so m-2 lands on the prior month
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/**
 * Once a new month has started, auto-generates and caches the AI summary for
 * the month that just ended — the "at the end of the month" summary happens
 * on its own as long as the server is kept running, no button required.
 * A no-op every day except when a summary is genuinely missing, so it's
 * cheap to check unconditionally on each daily tick.
 */
async function maybeGeneratePreviousMonthSummary() {
  if (!process.env.ANTHROPIC_API_KEY) return;
  const prevMonth = previousMonthKey(todayIso());
  if (getMonthlySummary(prevMonth)) return;

  const entries = entriesForMonth(getAllEntries(), prevMonth);
  if (entries.length < MIN_ENTRIES_FOR_AUTO_SUMMARY) return;

  try {
    const narrative = generateNarrative(entries);
    const summary = await generateAiSummary(monthLabel(prevMonth), entries, narrative);
    saveMonthlySummary(prevMonth, {
      summary,
      generatedAt: new Date().toISOString(),
      entryCountAtGeneration: entries.length,
    });
    console.log(`[scheduler] generated AI summary for ${prevMonth}`);
  } catch (err) {
    console.error(`[scheduler] AI summary generation failed for ${prevMonth}:`, err.message);
  }
}

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
    await maybeGeneratePreviousMonthSummary();
  });
  console.log(`[scheduler] daily auto-fetch armed: "${schedule}"`);
}
