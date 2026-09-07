import { geocode, fetchPressure } from "./weather.js";
import { fetchKpIndex } from "./kpindex.js";
import { fallbackPressure, fallbackKpIndex } from "./llmFallback.js";
import { computeTrend } from "./trend.js";
import { checkAlerts, sendDesktopNotification } from "./notify.js";
import { getConfig, setConfig, getPriorReading, upsertEntry } from "./store.js";

/** Resolve and cache lat/lon for the configured location, geocoding only when needed. */
async function resolveLocation() {
  const config = getConfig();
  if (typeof config.latitude === "number" && typeof config.longitude === "number") {
    return config;
  }
  const geo = await geocode(config.location);
  return setConfig({ latitude: geo.latitude, longitude: geo.longitude });
}

/**
 * Fetch live pressure + Kp-index for `date`, derive the trend from the prior
 * logged reading, store it on that day's entry, and check alert thresholds.
 * Falls back to an LLM-sourced reading only if the primary API call throws.
 */
export async function fetchLiveReading(date) {
  const config = await resolveLocation();

  let pressure;
  try {
    pressure = await fetchPressure(config.latitude, config.longitude);
  } catch (err) {
    pressure = await fallbackPressure(config.location).catch(() => {
      throw err;
    });
  }

  let kp;
  try {
    kp = await fetchKpIndex();
  } catch (err) {
    kp = await fallbackKpIndex().catch(() => {
      throw err;
    });
  }

  const prior = getPriorReading(date);
  const trend = computeTrend(pressure.pressureHpa, prior?.pressureHpa);

  const entry = upsertEntry(date, {
    pressureHpa: pressure.pressureHpa,
    pressureSource: pressure.source,
    kpIndex: kp.kpIndex,
    trend,
    readingAsOf: pressure.time,
  });

  const alerts = checkAlerts(entry, prior);
  for (const alert of alerts) {
    await sendDesktopNotification(alert);
  }

  return { entry, alerts };
}

export function todayIso() {
  return new Date().toISOString().slice(0, 10);
}
