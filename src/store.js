import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, "..", "data");
const ENTRIES_FILE = path.join(DATA_DIR, "entries.json");
const CONFIG_FILE = path.join(DATA_DIR, "config.json");

const DEFAULT_CONFIG = {
  location: "Ljubljana, Slovenia",
  latitude: 46.0569,
  longitude: 14.5058,
};

function ensureDataDir() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readJson(file, fallback) {
  ensureDataDir();
  if (!fs.existsSync(file)) return fallback;
  const raw = fs.readFileSync(file, "utf-8").trim();
  if (!raw) return fallback;
  return JSON.parse(raw);
}

function writeJson(file, data) {
  ensureDataDir();
  const tmp = `${file}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
  fs.renameSync(tmp, file);
}

export function getAllEntries() {
  const entries = readJson(ENTRIES_FILE, {});
  return Object.values(entries).sort((a, b) => a.date.localeCompare(b.date));
}

export function getEntry(date) {
  const entries = readJson(ENTRIES_FILE, {});
  return entries[date] || null;
}

/** Most recent entry with a pressureHpa reading, strictly before the given date. */
export function getPriorReading(date) {
  const entries = getAllEntries().filter(
    (e) => e.date < date && typeof e.pressureHpa === "number"
  );
  if (entries.length === 0) return null;
  return entries[entries.length - 1];
}

export function upsertEntry(date, fields) {
  const entries = readJson(ENTRIES_FILE, {});
  const existing = entries[date] || { date };
  entries[date] = { ...existing, ...fields, date };
  writeJson(ENTRIES_FILE, entries);
  return entries[date];
}

export function deleteEntry(date) {
  const entries = readJson(ENTRIES_FILE, {});
  delete entries[date];
  writeJson(ENTRIES_FILE, entries);
}

export function getConfig() {
  return { ...DEFAULT_CONFIG, ...readJson(CONFIG_FILE, {}) };
}

export function setConfig(fields) {
  const config = { ...getConfig(), ...fields };
  writeJson(CONFIG_FILE, config);
  return config;
}
