const KP_STORM_THRESHOLD = 5;
const SHARP_PRESSURE_DROP_HPA = 3;

let notifier = null;
async function getNotifier() {
  if (notifier !== null) return notifier;
  try {
    const mod = await import("node-notifier");
    notifier = mod.default ?? mod;
  } catch {
    notifier = false;
  }
  return notifier;
}

/**
 * Given a freshly-fetched reading and the prior day's reading, decide which
 * alerts (if any) are worth surfacing right now rather than in a monthly
 * review: a geomagnetic storm, or a sharp same-to-next-day pressure drop.
 */
export function checkAlerts(reading, priorReading) {
  const alerts = [];
  if (typeof reading.kpIndex === "number" && reading.kpIndex >= KP_STORM_THRESHOLD) {
    alerts.push({
      type: "kp-storm",
      message: `Geomagnetic storm watch: Kp index is ${reading.kpIndex} (storm threshold is ${KP_STORM_THRESHOLD}).`,
    });
  }
  if (priorReading && typeof priorReading.pressureHpa === "number") {
    const drop = priorReading.pressureHpa - reading.pressureHpa;
    if (drop >= SHARP_PRESSURE_DROP_HPA) {
      alerts.push({
        type: "pressure-drop",
        message: `Sharp pressure drop: ${drop.toFixed(1)} hPa since the last reading (${priorReading.pressureHpa} -> ${reading.pressureHpa} hPa).`,
      });
    }
  }
  return alerts;
}

/** Best-effort desktop notification. No-op (never throws) if unavailable, e.g. in a headless/container environment. */
export async function sendDesktopNotification(alert) {
  const n = await getNotifier();
  if (!n) return false;
  try {
    n.notify({ title: "Symptom & Weather Tracker", message: alert.message, sound: true });
    return true;
  } catch {
    return false;
  }
}
