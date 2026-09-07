/**
 * Fallback for when the primary weather/Kp APIs are unreachable (e.g. a
 * sandboxed environment with no outbound network access). Mirrors what the
 * original Claude.ai artifact did: ask an LLM for the current reading with
 * instructions to return strict JSON. Requires ANTHROPIC_API_KEY; if unset,
 * this just rethrows so the caller can surface the original network error.
 */
const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";

async function askClaudeForJson(prompt) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("No ANTHROPIC_API_KEY set; cannot use LLM fallback");
  }
  const res = await fetch(ANTHROPIC_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-5",
      max_tokens: 256,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!res.ok) throw new Error(`LLM fallback request failed: ${res.status}`);
  const data = await res.json();
  const text = data.content?.[0]?.text ?? "";
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("LLM fallback returned no JSON");
  return JSON.parse(match[0]);
}

export async function fallbackPressure(locationName) {
  const json = await askClaudeForJson(
    `What is the current sea-level barometric pressure in hPa at ${locationName} right now? ` +
      `Reply with ONLY strict JSON, no prose, no markdown fences: ` +
      `{"pressureHpa": <number>, "time": "<ISO 8601 timestamp>"}`
  );
  return { pressureHpa: json.pressureHpa, time: json.time, source: "LLM fallback" };
}

export async function fallbackKpIndex() {
  const json = await askClaudeForJson(
    `What is the current planetary Kp-index (geomagnetic activity, 0-9 scale) right now? ` +
      `Reply with ONLY strict JSON, no prose, no markdown fences: ` +
      `{"kpIndex": <number>, "time": "<ISO 8601 timestamp>"}`
  );
  return { kpIndex: json.kpIndex, time: json.time };
}
