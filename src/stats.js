/** Pearson correlation coefficient between two equal-length numeric arrays. */
export function pearson(xs, ys) {
  const n = xs.length;
  if (n < 2) return null;
  const meanX = xs.reduce((a, b) => a + b, 0) / n;
  const meanY = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let denomX = 0;
  let denomY = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - meanX;
    const dy = ys[i] - meanY;
    num += dx * dy;
    denomX += dx * dx;
    denomY += dy * dy;
  }
  const denom = Math.sqrt(denomX * denomY);
  if (denom === 0) return null;
  return num / denom;
}

const MIN_POINTS_FOR_CORRELATION = 5;

function pairedValues(entries, keyA, keyB) {
  const xs = [];
  const ys = [];
  for (const e of entries) {
    const a = e[keyA];
    const b = e[keyB];
    if (typeof a === "number" && typeof b === "number") {
      xs.push(a);
      ys.push(b);
    }
  }
  return { xs, ys };
}

/**
 * Correlation of fog against pressure, temperature, Kp-index, energy,
 * sleep, and mood, each computed across the days that have both values
 * logged. Returns r=null when there aren't enough paired points
 * (< MIN_POINTS_FOR_CORRELATION) to be meaningful.
 */
export function fogCorrelations(entries) {
  const targets = ["pressureHpa", "temperatureC", "kpIndex", "energy", "sleep", "mood"];
  const result = {};
  for (const key of targets) {
    const { xs, ys } = pairedValues(entries, "fog", key);
    result[key] = {
      r: xs.length >= MIN_POINTS_FOR_CORRELATION ? pearson(xs, ys) : null,
      n: xs.length,
    };
  }
  return result;
}

/** Average fog severity grouped by pressure trend. */
export function avgFogByTrend(entries) {
  const groups = { rising: [], falling: [], stable: [], unsure: [] };
  for (const e of entries) {
    if (typeof e.fog !== "number") continue;
    const trend = groups[e.trend] ? e.trend : "unsure";
    groups[trend].push(e.fog);
  }
  const out = {};
  for (const [trend, values] of Object.entries(groups)) {
    out[trend] = {
      avg: values.length ? values.reduce((a, b) => a + b, 0) / values.length : null,
      n: values.length,
    };
  }
  return out;
}

const SERIES_FIELDS = ["fog", "energy", "mood", "sleep", "pressureHpa", "kpIndex"];

/** Last N logged days (by date) with every chartable field, for the Patterns time-series panels. */
export function recentSeries(entries, days = 30) {
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
  return sorted.slice(-days).map((e) => {
    const point = { date: e.date };
    for (const field of SERIES_FIELDS) {
      point[field] = typeof e[field] === "number" ? e[field] : null;
    }
    return point;
  });
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** "2026-08" -> "August 2026" */
export function monthLabel(month) {
  const [y, m] = month.split("-").map(Number);
  return `${MONTH_NAMES[m - 1]} ${y}`;
}

/** Distinct calendar months present in `entries`, most recent first, with a day count each. */
export function listMonths(entries) {
  const counts = new Map();
  for (const e of entries) {
    const month = e.date.slice(0, 7);
    counts.set(month, (counts.get(month) || 0) + 1);
  }
  return [...counts.entries()]
    .map(([month, count]) => ({ month, count, label: monthLabel(month) }))
    .sort((a, b) => b.month.localeCompare(a.month));
}

/** Entries whose date falls within the given "YYYY-MM" month, sorted ascending. */
export function entriesForMonth(entries, month) {
  return entries.filter((e) => e.date.startsWith(month)).sort((a, b) => a.date.localeCompare(b.date));
}

export const FOG_COLOR_SCALE = {
  1: "#6FA87E",
  2: "#9AAE72",
  3: "#C69A4E",
  4: "#C4824D",
  5: "#B1503F",
};
