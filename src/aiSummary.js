const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_MODEL = "claude-sonnet-5";
const OLLAMA_HOST = process.env.OLLAMA_HOST || "http://localhost:11434";

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

async function callAnthropic(prompt) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const res = await fetch(ANTHROPIC_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
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

/** Free, local, no API key — talks to a locally-running Ollama server. */
async function callOllama(prompt) {
  const model = process.env.OLLAMA_MODEL;
  let res;
  try {
    res = await fetch(`${OLLAMA_HOST}/api/chat`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: prompt }],
        stream: false,
      }),
    });
  } catch (err) {
    throw new Error(
      `Could not reach Ollama at ${OLLAMA_HOST} — is it running? Start it with \`ollama serve\` (or open the Ollama app). ${err.message}`
    );
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(
      `Ollama request failed: ${res.status} ${body.slice(0, 200)} — is model "${model}" pulled? Try: ollama pull ${model}`
    );
  }

  const data = await res.json();
  const text = (data.message?.content ?? "").trim();
  if (!text) throw new Error("Ollama response was empty");
  return text;
}

/**
 * Generates the summary via whichever provider is configured. Set
 * OLLAMA_MODEL to use a free local model via Ollama (no key, no network,
 * notes never leave the machine); otherwise falls back to the Anthropic API
 * if ANTHROPIC_API_KEY is set. Throws a clear error if neither is configured.
 */
export async function generateAiSummary(monthLabel, entries, narrative) {
  const prompt = buildPrompt(monthLabel, entries, narrative);

  if (process.env.OLLAMA_MODEL) {
    return callOllama(prompt);
  }
  if (process.env.ANTHROPIC_API_KEY) {
    return callAnthropic(prompt);
  }
  throw new Error(
    'No AI provider configured — set OLLAMA_MODEL (free, local, e.g. "llama3.2") or ANTHROPIC_API_KEY. See README.'
  );
}
