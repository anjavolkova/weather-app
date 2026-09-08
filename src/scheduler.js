import cron from "node-cron";
import { fetchLiveReading, todayIso } from "./reading.js";
import { getAllEntries, getMonthlySummary, saveMonthlySummary } from "./store.js";
import { entriesForMonth, monthLabel, listMonths } from "./stats.js";
import { generateNarrative } from "./narrative.js";
import { generateAiSummary } from "./aiSummary.js";

const MIN_ENTRIES_FOR_AUTO_SUMMARY = 5;

/**
 * Generates and caches the AI summary for any completed past month that's
 * missing one (and has enough entries) — not just the month that just
 * ended, so a month is never permanently skipped just because the server
 * happened to be off when it ended. Checked on every daily tick; a no-op
 * once everything eligible is already cached. Provider selection (Ollama vs
 * Anthropic vs neither) is entirely generateAiSummary()'s job — this never
 * duplicates that check, so it can't drift out of sync with it.
 */
export async function generateMissingMonthlySummaries() {
  const allEntries = getAllEntries();
  const currentMonth = todayIso().slice(0, 7);

  for (const { month, count } of listMonths(allEntries)) {
    if (month >= currentMonth) continue; // skip the in-progress current month
    if (count < MIN_ENTRIES_FOR_AUTO_SUMMARY) continue;
    if (getMonthlySummary(month)) continue;

    const entries = entriesForMonth(allEntries, month);
    try {
      const narrative = generateNarrative(entries);
      const summary = await generateAiSummary(monthLabel(month), entries, narrative);
      saveMonthlySummary(month, {
        summary,
        generatedAt: new Date().toISOString(),
        entryCountAtGeneration: entries.length,
      });
      console.log(`[scheduler] generated AI summary for ${month}`);
    } catch (err) {
      console.error(`[scheduler] AI summary generation failed for ${month}:`, err.message);
      // No provider configured applies to every month equally — one log line
      // per run is enough, no need to repeat it for each past month.
      if (/no ai provider configured/i.test(err.message)) break;
    }
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
    await generateMissingMonthlySummaries();
  });
  console.log(`[scheduler] daily auto-fetch armed: "${schedule}"`);
}
