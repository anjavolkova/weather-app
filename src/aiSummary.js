const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-sonnet-5";

function formatEntryLine(entry) {
  const parts = [];
  if (typeof entry.fog === "number") parts.push(`fog ${entry.fog}/5`);
  if (typeof entry.energy === "number") parts.push(`energy ${entry.energy}/5`);
  if (typeof entry.mood === "number") parts.push(`mood ${entry.mood}/5`);
  if (typeof entry.sleep === "number") parts.push(`sleep ${entry.sleep}/5`);
  if (typeof entry.pressureHpa === "number") {
    parts.push(`pressure ${entry.pressureHpa}hPa (${entry.trend || "unsure"})`);
  }
  if (typeof entry.kpIndex === "number") parts.push(`Kp ${entry.kpIndex}`);
  const stats = parts.join(", ") || "no readings logged";
  const notes = entry.notes && entry.notes.trim() ? ` — notes: "${entry.notes.trim()}"` : "";
  return `${entry.date}: ${stats}${notes}`;
}

/**
 * Builds the prompt for the monthly AI summary. Pure and network-free so it's
 * testable on its own. Hands the model already-computed stats/correlations
 * rather than asking it to do the math itself — its job is to synthesize the
 * notes with those numbers into prose, not to (mis)calculate anything.
 */
export function buildPrompt(monthLabel, entries, narrative) {
  const dailyLog = entries.map(formatEntryLine).join("\n");
  const statLines = narrative.stats.map((s) => `${s.label}: ${s.value}`).join("\n") || "(not enough data yet)";
  const observationLines = narrative.paragraphs.join("\n");

  return `You are writing a monthly summary for the person who kept this personal symptom-and-weather log, to appear in their own tracking app. Write 3-4 short paragraphs about ${monthLabel}, in second person ("you").

Ground every sentence ONLY in the data given below. Never invent symptoms, events, causes, or note content that isn't present. You may reference specific days or quote short phrases from the notes where it genuinely helps. Do not give medical advice, diagnosis, or causal claims beyond what the computed observations already state — describe patterns, don't prescribe. Plain prose only: no headers, no bullet points, no markdown formatting, paragraphs separated by a blank line.

Computed stats for the month:
${statLines}

Computed observations (already calculated — do not recompute or contradict these):
${observationLines}

Daily log:
${dailyLog}`;
}

/**
 * Calls the Anthropic API to generate the summary. Requires ANTHROPIC_API_KEY;
 * throws a clear error if it's unset so the caller can surface that to the UI.
 */
export async function generateAiSummary(monthLabel, entries, narrative) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not set on the server — AI summaries are disabled.");
  }

  const prompt = buildPrompt(monthLabel, entries, narrative);
  const res = await fetch(ANTHROPIC_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 700,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`AI summary request failed: ${res.status} ${body.slice(0, 200)}`);
  }

  const data = await res.json();
  const text = (data.content?.[0]?.text ?? "").trim();
  if (!text) throw new Error("AI summary response was empty");
  return text;
}
