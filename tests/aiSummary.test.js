import { test } from "node:test";
import assert from "node:assert/strict";
import { buildPrompt } from "../src/aiSummary.js";

const narrative = {
  stats: [
    { label: "Days logged", value: "20" },
    { label: "Average fog", value: "2.9/5" },
  ],
  paragraphs: ["Fog shows a strong correlation with mood (r = -1.00)."],
};

test("buildPrompt: includes month label, stats, observations, and daily log", () => {
  const entries = [
    { date: "2026-08-19", fog: 3, energy: 4, mood: 3, sleep: 3, pressureHpa: 1015, trend: "rising", kpIndex: 2.1, notes: "Bad headache" },
  ];
  const prompt = buildPrompt("August 2026", entries, narrative);
  assert.match(prompt, /August 2026/);
  assert.match(prompt, /Days logged: 20/);
  assert.match(prompt, /Average fog: 2\.9\/5/);
  assert.match(prompt, /strong correlation with mood/);
  assert.match(prompt, /2026-08-19: fog 3\/5, energy 4\/5, mood 3\/5, sleep 3\/5, pressure 1015hPa \(rising\), Kp 2\.1 — notes: "Bad headache"/);
});

test("buildPrompt: instructs the model to stay grounded in the given data", () => {
  const prompt = buildPrompt("August 2026", [], narrative);
  assert.match(prompt, /[Nn]ever invent/);
  assert.match(prompt, /second person/);
});

test("buildPrompt: handles a day with no notes and a day with no readings", () => {
  const entries = [
    { date: "2026-08-01", fog: 2 },
    { date: "2026-08-02", notes: "Just tired" },
  ];
  const prompt = buildPrompt("August 2026", entries, narrative);
  assert.match(prompt, /2026-08-01: fog 2\/5$/m);
  assert.match(prompt, /2026-08-02: no readings logged — notes: "Just tired"/);
});
