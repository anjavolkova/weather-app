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

**Closing the terminal doesn't lose data** — every save writes straight to
that JSON file on disk. It only stops the web server from being reachable
until you run `npm start` again. See below to keep it running without
babysitting a terminal window.

## Run it continuously

This is a local app — no need to deploy it anywhere (deploying to a
serverless host like Vercel would actually *break* the JSON-file storage,
since serverless filesystems don't persist writes). Instead, run it as a
background service on your own machine with [pm2](https://pm2.keymetrics.io/),
so it survives closing the terminal and restarts automatically on reboot:

```bash
npm install -g pm2
npm run pm2:start        # starts the server under pm2, using ecosystem.config.cjs
pm2 startup               # prints a command to run once — makes pm2 itself survive a reboot
pm2 save                  # remembers the current process list so pm2 restores it on boot
```

The app is now at http://localhost:3000 permanently — reachable any time
your computer is on, no terminal required. Useful commands:

```bash
pm2 status                    # is it running?
npm run pm2:logs              # tail the server's logs
npm run pm2:restart           # restart after pulling code changes
npm run pm2:stop              # stop it
```

With the server always running, the built-in daily auto-fetch (07:00 local
time — see **Scheduled auto-log** below) fires on its own; you don't need
the separate OS-cron setup described there unless you'd rather not keep a
persistent server process running at all.

**On a headless Linux box** you may prefer a native `systemd` service
instead of pm2 — same idea, no extra dependency:

```ini
# /etc/systemd/system/symptom-weather-tracker.service
[Unit]
Description=Symptom & Weather Tracker
After=network.target

[Service]
Type=simple
WorkingDirectory=/path/to/weather-app
ExecStart=/usr/bin/node server.js
Restart=on-failure
Environment=PORT=3000

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable --now symptom-weather-tracker
```

**Want it reachable from your phone or away from home**, not just
`localhost`? That needs either port-forwarding on your router, a tool like
Tailscale/ngrok to reach your home machine remotely, or moving to a
cloud host with persistent storage (e.g. Railway, Render, Fly.io) — ask if
you want help setting one of those up; it's a bigger change than the above.

## Daily workflow

1. Open the **Day Log** tab (defaults to today).
2. Set the energy / fog / mood / sleep sliders and any notes, then **Save**.
   The backend fetches current pressure (Open-Meteo) and Kp-index (NOAA
   SWPC) for your configured location as part of the same save, and derives
   the pressure trend (rising/falling/stable) by comparing to the most
   recent prior reading — it isn't guessed and isn't manually set.
3. Check the **Month** tab for a calendar colored by fog severity, or
   **Patterns** for a "wrapped"-style summary of the last 30 days: a
   generated-text readout of what stands out (top correlation, pressure-trend
   comparison, storm days, best/worst day, and — once you have a handful of
   notes — which words come up most in them and how fog compares on days
   that mention the top one), three stacked time-series charts sharing one
   date axis (pressure, Kp-index, and fog/energy/mood/sleep — each on its
   own y-scale, hover for exact values), and the correlation cards, grouped
   into **Weather** (pressure, Kp-index) and **You** (energy, sleep, mood).

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

When either fires (from saving a Day Log entry, the in-process scheduler, or
`scripts/daily-fetch.js`), the app attempts a desktop
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

Pearson's r between fog and each of pressure / Kp-index / energy / sleep /
mood, computed across days that have both values logged. Requires at least 5
paired data points to display — treat it as descriptive, not causal. The
Patterns tab's narrative surfaces whichever of these r values is strongest,
in plain language, alongside a few other generated observations (all
computed from your logged numbers, never guessed).

## Notes analysis

The free-text notes on each day's entry feed into the Patterns narrative
too, via simple word-frequency counting — not an LLM read of the prose, so
it's instant and never invents what a note said. Once you have at least 5
days with notes, it surfaces the words you mention most often (skipping
common filler words like "the"/"and"/"was"), and — once there's a large
enough split — compares average fog on days that mention the top word
against days that don't (e.g. *"Days your notes mention 'headache' average
fog 4.2/5, versus 2.6/5 on days that don't"*). A word only counts once per
day no matter how many times it appears in that day's note.

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
src/narrative.js         Generated-text "wrapped" summary from computed stats
src/notify.js            Alert thresholds + desktop notification
src/csv.js               CSV export
src/scheduler.js         In-process daily auto-fetch (node-cron)
scripts/daily-fetch.js   Standalone entrypoint for OS cron/launchd
public/js/timeseries.js  Reusable SVG time-series chart (crosshair, tooltip, legend)
public/                  Frontend (vanilla HTML/CSS/JS, no build step)
tests/                   node:test unit tests for trend/stats/narrative/csv/notify logic
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
