/**
 * Derive a pressure trend by comparing a reading to the most recent prior one.
 * Diff > +1.5 hPa -> "rising"; < -1.5 -> "falling"; otherwise "stable".
 * With no prior reading to compare against, the trend is "unsure".
 */
export function computeTrend(currentHpa, priorHpa) {
  if (typeof priorHpa !== "number" || Number.isNaN(priorHpa)) return "unsure";
  const diff = currentHpa - priorHpa;
  if (diff > 1.5) return "rising";
  if (diff < -1.5) return "falling";
  return "stable";
}
