import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  getAllEntries,
  getEntry,
  upsertEntry,
  getConfig,
  setConfig,
  getPriorReading,
} from "./src/store.js";
import { fetchLiveReading, todayIso } from "./src/reading.js";
import { fogCorrelations, avgFogByTrend, recentSeries, FOG_COLOR_SCALE } from "./src/stats.js";
import { checkAlerts } from "./src/notify.js";
import { entriesToCsv } from "./src/csv.js";
import { geocode } from "./src/weather.js";
import { startScheduler } from "./src/scheduler.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
function requireValidDate(req, res, next) {
  if (!DATE_RE.test(req.params.date)) {
    return res.status(400).json({ error: "date must be YYYY-MM-DD" });
  }
  next();
}

const ENTRY_FIELDS = ["energy", "fog", "mood", "sleep", "trend", "notes"];
const SCALE_FIELDS = ["energy", "fog", "mood", "sleep"];
const VALID_TRENDS = ["rising", "falling", "stable", "unsure"];

function validateEntryBody(body) {
  for (const field of SCALE_FIELDS) {
    if (field in body) {
      const v = body[field];
      if (v !== null && (typeof v !== "number" || v < 1 || v > 5)) {
        return `${field} must be a number 1-5 or null`;
      }
    }
  }
  if ("trend" in body && body.trend !== null && !VALID_TRENDS.includes(body.trend)) {
    return `trend must be one of ${VALID_TRENDS.join(", ")}`;
  }
  if ("notes" in body && body.notes !== null && typeof body.notes !== "string") {
    return "notes must be a string";
  }
  return null;
}

app.get("/api/entries", (req, res) => {
  res.json(getAllEntries());
});

app.get("/api/entries/:date", requireValidDate, (req, res) => {
  const entry = getEntry(req.params.date) || { date: req.params.date };
  res.json(entry);
});

app.put("/api/entries/:date", requireValidDate, (req, res) => {
  const error = validateEntryBody(req.body || {});
  if (error) return res.status(400).json({ error });

  const fields = {};
  for (const field of ENTRY_FIELDS) {
    if (field in req.body) fields[field] = req.body[field];
  }
  const entry = upsertEntry(req.params.date, fields);
  res.json(entry);
});

app.post("/api/entries/:date/fetch-reading", requireValidDate, async (req, res) => {
  try {
    const { entry, alerts } = await fetchLiveReading(req.params.date);
    res.json({ entry, alerts });
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

app.get("/api/entries/:date/alerts", requireValidDate, (req, res) => {
  const entry = getEntry(req.params.date);
  if (!entry) return res.json([]);
  const prior = getPriorReading(req.params.date);
  res.json(checkAlerts(entry, prior));
});

app.get("/api/patterns", (req, res) => {
  const entries = getAllEntries();
  res.json({
    avgFogByTrend: avgFogByTrend(entries),
    correlations: fogCorrelations(entries),
    series: recentSeries(entries, 30),
    fogColorScale: FOG_COLOR_SCALE,
    totalDays: entries.length,
  });
});

app.get("/api/config", (req, res) => {
  res.json(getConfig());
});

app.put("/api/config", async (req, res) => {
  try {
    const { location } = req.body || {};
    if (!location || typeof location !== "string") {
      return res.status(400).json({ error: "location must be a non-empty string" });
    }
    const geo = await geocode(location);
    const config = setConfig({ location, latitude: geo.latitude, longitude: geo.longitude });
    res.json(config);
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

app.get("/api/export.csv", (req, res) => {
  const csv = entriesToCsv(getAllEntries());
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", "attachment; filename=symptom-weather-log.csv");
  res.send(csv);
});

app.get("/api/today", (req, res) => {
  res.json({ date: todayIso() });
});

app.listen(PORT, () => {
  console.log(`Symptom & Weather Tracker running at http://localhost:${PORT}`);
  startScheduler();
});
