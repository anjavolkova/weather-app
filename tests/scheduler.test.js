import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

// Isolated data dir + a fake Ollama provider, set up before importing any
// module that reads these at import/call time.
process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "scheduler-test-"));
process.env.OLLAMA_MODEL = "test-model";
delete process.env.ANTHROPIC_API_KEY;

const { upsertEntry, getMonthlySummary } = await import("../src/store.js");
const { generateMissingMonthlySummaries } = await import("../src/scheduler.js");

function monthKeyOffset(offsetMonths) {
  const d = new Date();
  d.setDate(1); // avoid month-length overflow when shifting months
  d.setMonth(d.getMonth() + offsetMonths);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function seedMonth(monthKey, days) {
  const [y, m] = monthKey.split("-");
  for (let d = 1; d <= days; d++) {
    const date = `${y}-${m}-${String(d).padStart(2, "0")}`;
    upsertEntry(date, { fog: 3, energy: 3, mood: 3, sleep: 3, notes: "note" });
  }
}

test("generateMissingMonthlySummaries: generates for eligible past months, skips too-sparse and in-progress months", async () => {
  const twoMonthsAgo = monthKeyOffset(-2);
  const oneMonthAgo = monthKeyOffset(-1);
  const thisMonth = monthKeyOffset(0);

  seedMonth(twoMonthsAgo, 10); // past, enough entries -> eligible
  seedMonth(oneMonthAgo, 3); // past, too few entries -> skipped
  seedMonth(thisMonth, 10); // current month, still in progress -> skipped

  let fetchCalls = 0;
  const originalFetch = global.fetch;
  global.fetch = async () => {
    fetchCalls++;
    return {
      ok: true,
      json: async () => ({ message: { content: "Mock monthly summary." } }),
    };
  };

  try {
    await generateMissingMonthlySummaries();
  } finally {
    global.fetch = originalFetch;
  }

  assert.equal(fetchCalls, 1, "should only call the AI provider once (only one eligible month)");
  assert.ok(getMonthlySummary(twoMonthsAgo), "eligible past month should have a cached summary");
  assert.equal(getMonthlySummary(oneMonthAgo), null, "too-sparse month should stay ungenerated");
  assert.equal(getMonthlySummary(thisMonth), null, "in-progress current month should stay ungenerated");
});

test("generateMissingMonthlySummaries: does not re-generate an already-cached summary", async () => {
  fs.rmSync(process.env.DATA_DIR, { recursive: true, force: true });
  fs.mkdirSync(process.env.DATA_DIR, { recursive: true });

  const twoMonthsAgo = monthKeyOffset(-2);
  seedMonth(twoMonthsAgo, 10);

  const { saveMonthlySummary } = await import("../src/store.js");
  saveMonthlySummary(twoMonthsAgo, { summary: "Already here.", generatedAt: new Date().toISOString(), entryCountAtGeneration: 10 });

  let fetchCalls = 0;
  const originalFetch = global.fetch;
  global.fetch = async () => {
    fetchCalls++;
    return { ok: true, json: async () => ({ message: { content: "Should not be called." } }) };
  };

  try {
    await generateMissingMonthlySummaries();
  } finally {
    global.fetch = originalFetch;
  }

  assert.equal(fetchCalls, 0, "already-cached month should not trigger another provider call");
  assert.equal(getMonthlySummary(twoMonthsAgo).summary, "Already here.");
});
