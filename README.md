# Symptom & Weather Tracker

A local, single-user app for daily logging of energy / brain fog / mood / sleep,
alongside live barometric pressure and geomagnetic (Kp-index) readings — with a
monthly calendar view and basic correlation analysis.

Re-platformed from a Claude.ai React artifact so it can make real outbound API
calls (the artifact sandbox can't reach external APIs).

## Requirements

- Node.js 18+

## Setup

```bash
npm install
npm start
```

Then open http://localhost:3000. Default location is Ljubljana, Slovenia —
change it any time via the 📍 button in the top bar.

Data is stored as plain JSON in `data/entries.json` and `data/config.json`
(created automatically on first write). No database setup needed.

## Daily workflow

1. Open the **Day Log** tab (defaults to today).
2. Click **Fetch live reading** to pull current pressure (Open-Meteo) and
   Kp-index (NOAA SWPC) for your configured location. The pressure trend
   (rising/falling/stable) is computed by comparing to the most recent prior
   reading — not guessed.
3. Set the energy / fog / mood / sleep sliders and any notes, then **Save**.
4. Check the **Month** tab for a calendar colored by fog severity, or
   **Patterns** for average fog by pressure trend, correlations, and a
   30-day fog/energy chart.

## APIs used (both free, no key required)

- **Pressure** — [Open-Meteo](https://open-meteo.com/) geocoding + forecast
  (`current.pressure_msl`, sea-level-adjusted hPa)
- **Geomagnetic activity** — [NOAA SWPC planetary K-index](https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json)

If either is unreachable, the app falls back to an LLM-sourced reading (same
approach as the original artifact) when `ANTHROPIC_API_KEY` is set in the
environment; otherwise it surfaces the original network error.

## Scheduled auto-log

**While the server is running**, it auto-fetches pressure + Kp every morning
at 07:00 local time and pre-fills that day's entry, so the only manual step
left is the symptom sliders. Override the schedule with `AUTO_FETCH_CRON`
(standard 5-field cron, e.g. `AUTO_FETCH_CRON="30 6 * * *"`), or disable it
with `AUTO_FETCH_CRON=off`.

**If you don't keep the server running continuously**, use the standalone
script from an OS-level scheduler instead:

```bash
node scripts/daily-fetch.js
```

- **macOS (launchd)** — create `~/Library/LaunchAgents/com.symptomtracker.dailyfetch.plist`:

  ```xml
  <?xml version="1.0" encoding="UTF-8"?>
  <!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
  <plist version="1.0">
  <dict>
    <key>Label</key><string>com.symptomtracker.dailyfetch</string>
    <key>ProgramArguments</key>
    <array>
      <string>/usr/local/bin/node</string>
      <string>/path/to/weather-app/scripts/daily-fetch.js</string>
    </array>
    <key>StartCalendarInterval</key>
    <dict><key>Hour</key><integer>7</integer><key>Minute</key><integer>0</integer></dict>
    <key>StandardOutPath</key><string>/path/to/weather-app/data/fetch.log</string>
    <key>StandardErrorPath</key><string>/path/to/weather-app/data/fetch.log</string>
  </dict>
  </plist>
  ```

  Then `launchctl load ~/Library/LaunchAgents/com.symptomtracker.dailyfetch.plist`.

- **Linux/cron** — `crontab -e` and add:

  ```
  0 7 * * * cd /path/to/weather-app && /usr/bin/node scripts/daily-fetch.js >> data/fetch.log 2>&1
  ```

## Alerts

A reading is checked against two thresholds worth noticing in the moment:

- **Kp-index ≥ 5** (geomagnetic storm)
- **Sharp pressure drop** — ≥ 3 hPa since the last logged reading

When either fires (from the UI's "Fetch live reading" button, the in-process
scheduler, or `scripts/daily-fetch.js`), the app attempts a desktop
notification via `node-notifier` (best-effort — silently skipped if no
notification daemon is available, e.g. in a headless environment) and always
shows a banner in the web UI.

## Export

`GET /api/export.csv`, or the **Export CSV** button in the top bar, downloads
the full log for analysis elsewhere.

## Data model

One JSON record per date, stored in `data/entries.json`:

```json
{
  "date": "2026-09-07",
  "energy": 3,
  "fog": 4,
  "mood": 3,
  "sleep": 3,
  "trend": "falling",
  "notes": "",
  "pressureHpa": 1008.2,
  "pressureSource": "Open-Meteo",
  "kpIndex": 2.3,
  "readingAsOf": "2026-09-07T14:00"
}
```

## Correlation analysis

Pearson's r between fog and each of energy / sleep / mood / Kp-index, computed
across days that have both values logged. Requires at least 5 paired data
points to display — treat it as descriptive, not causal.

## Project layout

```
server.js              Express app + API routes
src/store.js            JSON-file persistence
src/weather.js           Open-Meteo geocoding + pressure fetch
src/kpindex.js           NOAA Kp-index fetch
src/llmFallback.js       LLM fallback when the above are unreachable
src/reading.js           Orchestrates a live fetch: pressure + Kp + trend + alerts
src/trend.js             Pressure trend computation
src/stats.js             Pearson correlation, fog-by-trend, chart series
src/notify.js            Alert thresholds + desktop notification
src/csv.js               CSV export
src/scheduler.js         In-process daily auto-fetch (node-cron)
scripts/daily-fetch.js   Standalone entrypoint for OS cron/launchd
public/                  Frontend (vanilla HTML/CSS/JS, no build step)
tests/                   node:test unit tests for trend/stats/csv/notify logic
```

## Tests

```bash
npm test
```

## Environment variables

| Variable            | Purpose                                              | Default          |
|---------------------|-------------------------------------------------------|-------------------|
| `PORT`               | HTTP port                                             | `3000`            |
| `AUTO_FETCH_CRON`    | Cron expression for the in-process daily fetch, or `off` | `0 7 * * *`     |
| `ANTHROPIC_API_KEY`  | Enables the LLM fallback if the weather/Kp APIs are unreachable | unset |
| `DATA_DIR`           | Where `entries.json`/`config.json` are stored          | `./data`          |

## Design

Dark, instrument-panel feel: deep ink background, brass accent for primary
actions, an SVG barometer dial for the day's fog reading. Serif italic
headings, sans-serif body/data.
