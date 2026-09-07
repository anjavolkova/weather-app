import { fogCorrelations, avgFogByTrend } from "./stats.js";

const STORM_KP = 5;
const MIN_DAYS_FOR_INSIGHTS = 5;
const MIN_GROUP_SIZE_FOR_TREND_COMPARISON = 3;
const MIN_NOTE_DAYS_FOR_THEMES = 5;
const MIN_WORD_DAYS = 3;
const TOP_WORDS_SHOWN = 3;

// Common English function words, excluded so word-frequency picks out the
// actual content of a note (symptoms, activities, places) rather than glue words.
const STOPWORDS = new Set([
  "the", "and", "was", "but", "for", "with", "this", "that", "have", "had",
  "were", "are", "from", "they", "them", "then", "than", "when", "what",
  "just", "very", "really", "today", "yesterday", "tomorrow", "about",
  "been", "being", "would", "could", "should", "there", "their", "here",
  "some", "more", "most", "much", "even", "also", "still", "again",
  "after", "before", "during", "while", "because", "into", "onto", "over",
  "under", "between", "through", "around", "without", "not", "did", "does",
  "doing", "done", "get", "got", "getting", "went", "going", "make",
  "made", "making", "take", "took", "taking", "like", "know", "its",
  "it's", "i'm", "im", "me", "my", "mine", "you", "your", "yours", "he",
  "she", "his", "her", "we", "our", "ours", "who", "whom", "which", "how",
  "why", "all", "any", "both", "each", "few", "other", "such", "only",
  "own", "same", "too", "can", "will", "don", "dont", "didn", "didnt",
  "doesn", "doesnt", "isn", "isnt", "wasn", "wasnt", "weren", "werent",
  "won", "wont", "couldn", "couldnt", "shouldn", "shouldnt", "day", "days",
]);

const CORR_LABELS = {
  pressureHpa: "barometric pressure",
  kpIndex: "Kp-index",
  energy: "energy",
  sleep: "sleep quality",
  mood: "mood",
};

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

function tokenize(text) {
  const words = text.toLowerCase().match(/[a-z']+/g) || [];
  return words.filter((w) => w.length >= 3 && !STOPWORDS.has(w));
}

/**
 * Word-frequency analysis of the free-text notes — deterministic, not an LLM
 * read of the prose, so it stays instant and never invents what a note said.
 * Surfaces the most-mentioned words, and (when there's a large enough split)
 * compares average fog on days that mention the top word against days that don't.
 */
function extractNoteThemes(entries) {
  const dayWords = entries
    .filter((e) => typeof e.notes === "string" && e.notes.trim().length > 0)
    .map((e) => ({ fog: e.fog, words: new Set(tokenize(e.notes)) }))
    .filter((d) => d.words.size > 0);

  if (dayWords.length < MIN_NOTE_DAYS_FOR_THEMES) return null;

  const wordDayCount = new Map();
  for (const { words } of dayWords) {
    for (const w of words) {
      wordDayCount.set(w, (wordDayCount.get(w) || 0) + 1);
    }
  }

  const ranked = [...wordDayCount.entries()]
    .filter(([, count]) => count >= MIN_WORD_DAYS)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  if (ranked.length === 0) return null;

  const topWords = ranked.slice(0, TOP_WORDS_SHOWN).map(([word, count]) => ({ word, count }));

  const [topWord] = ranked[0];
  const withWord = dayWords.filter((d) => d.words.has(topWord) && typeof d.fog === "number");
  const withoutWord = dayWords.filter((d) => !d.words.has(topWord) && typeof d.fog === "number");

  let comparison = null;
  if (withWord.length >= MIN_WORD_DAYS && withoutWord.length >= MIN_WORD_DAYS) {
    comparison = {
      word: topWord,
      avgWith: round1(avg(withWord.map((d) => d.fog))),
      avgWithout: round1(avg(withoutWord.map((d) => d.fog))),
    };
  }

  return { topWords, comparison };
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

  const themes = extractNoteThemes(entries);
  if (themes) {
    const wordList = themes.topWords.map((t) => `"${t.word}"`).join(", ");
    paragraphs.push(`Your notes mention ${wordList} most often this stretch.`);
    if (themes.comparison) {
      const { word, avgWith, avgWithout } = themes.comparison;
      paragraphs.push(
        `Days your notes mention "${word}" average fog ${avgWith}/5, versus ${avgWithout}/5 on days that don't.`
      );
    }
  }

  paragraphs.push(`Your clearest day was ${bestDay.date} (fog ${bestDay.fog}/5) — worth a look at what was different.`);

  return {
    headline: `${fogEntries.length} days logged — here's what stands out`,
    stats,
    paragraphs,
  };
}
