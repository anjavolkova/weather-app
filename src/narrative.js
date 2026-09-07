import { fogCorrelations, avgFogByTrend } from "./stats.js";

const STORM_KP = 5;
const MIN_DAYS_FOR_INSIGHTS = 5;
const MIN_GROUP_SIZE_FOR_TREND_COMPARISON = 3;

const CORR_LABELS = { energy: "energy", sleep: "sleep quality", mood: "mood", kpIndex: "Kp-index" };

function avg(values) {
  if (values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function round1(n) {
  return typeof n === "number" ? Math.round(n * 10) / 10 : n;
}

function strengthWord(absR) {
  if (absR >= 0.7) return "strong";
  if (absR >= 0.5) return "fairly strong";
  if (absR >= 0.3) return "moderate";
  return "weak";
}

function describeCorrelation(key, r) {
  const label = CORR_LABELS[key] || key;
  const strength = strengthWord(Math.abs(r));
  const direction =
    r >= 0
      ? `your fog tends to rise along with your ${label}`
      : `your fog tends to be worse when your ${label} is lower`;
  return `Fog shows a ${strength} correlation with ${label} (r = ${r.toFixed(2)}) — ${direction}.`;
}

/**
 * A deterministic, template-based summary of the logged month — every number
 * is computed from the entries, never guessed or asked of an LLM.
 */
export function generateNarrative(entries) {
  const fogEntries = entries.filter((e) => typeof e.fog === "number");
  const totalDays = entries.length;

  if (fogEntries.length === 0) {
    return {
      headline: "No entries yet",
      stats: [],
      paragraphs: ["Log a day to start building your weather & wellbeing picture."],
    };
  }

  const avgFog = round1(avg(fogEntries.map((e) => e.fog)));
  const worstDay = [...fogEntries].sort((a, b) => b.fog - a.fog || b.date.localeCompare(a.date))[0];
  const bestDay = [...fogEntries].sort((a, b) => a.fog - b.fog || b.date.localeCompare(a.date))[0];
  const stormDays = entries.filter((e) => typeof e.kpIndex === "number" && e.kpIndex >= STORM_KP).length;

  const stats = [
    { label: "Days logged", value: String(totalDays) },
    { label: "Average fog", value: `${avgFog}/5` },
    { label: "Foggiest day", value: `${worstDay.date} (${worstDay.fog}/5)` },
    { label: "Storm days (Kp ≥ 5)", value: String(stormDays) },
  ];

  if (fogEntries.length < MIN_DAYS_FOR_INSIGHTS) {
    const remaining = MIN_DAYS_FOR_INSIGHTS - fogEntries.length;
    return {
      headline: `${fogEntries.length} day${fogEntries.length === 1 ? "" : "s"} logged so far`,
      stats,
      paragraphs: [`Log ${remaining} more day${remaining === 1 ? "" : "s"} to unlock correlation and trend insights.`],
    };
  }

  const paragraphs = [];

  const correlations = fogCorrelations(entries);
  const ranked = Object.entries(correlations)
    .filter(([, { r }]) => r !== null)
    .sort((a, b) => Math.abs(b[1].r) - Math.abs(a[1].r));
  if (ranked.length > 0) {
    const [topKey, { r }] = ranked[0];
    paragraphs.push(describeCorrelation(topKey, r));
  } else {
    paragraphs.push("Not enough paired data yet to say what fog correlates with most — keep logging.");
  }

  const byTrend = avgFogByTrend(entries);
  if (
    byTrend.rising.n >= MIN_GROUP_SIZE_FOR_TREND_COMPARISON &&
    byTrend.falling.n >= MIN_GROUP_SIZE_FOR_TREND_COMPARISON
  ) {
    const worse = byTrend.falling.avg >= byTrend.rising.avg ? "falling" : "rising";
    const better = worse === "falling" ? "rising" : "falling";
    paragraphs.push(
      `Fog runs higher on ${worse}-pressure days (avg ${round1(byTrend[worse].avg)}/5) than on ${better}-pressure days (avg ${round1(byTrend[better].avg)}/5).`
    );
  }

  if (stormDays > 0) {
    paragraphs.push(
      `You logged ${stormDays} geomagnetic storm day${stormDays === 1 ? "" : "s"} (Kp ≥ ${STORM_KP}) in this stretch.`
    );
  }

  paragraphs.push(`Your clearest day was ${bestDay.date} (fog ${bestDay.fog}/5) — worth a look at what was different.`);

  return {
    headline: `${fogEntries.length} days logged — here's what stands out`,
    stats,
    paragraphs,
  };
}
