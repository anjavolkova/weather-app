const SCALE_FIELDS = ["energy", "fog", "mood", "sleep"];

const dayDateInput = document.getElementById("day-date");
const barometerSvg = document.getElementById("barometer");
const alertBanner = document.getElementById("alert-banner");

let currentEntry = { date: null };
let monthCursor = new Date();
monthCursor.setDate(1);

function todayKey() {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

function shiftDateKey(key, deltaDays) {
  const [y, m, d] = key.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + deltaDays);
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");
  return `${dt.getFullYear()}-${mm}-${dd}`;
}

function showAlerts(alerts) {
  if (!alerts || alerts.length === 0) {
    alertBanner.hidden = true;
    return;
  }
  alertBanner.textContent = alerts.map((a) => a.message).join("   •   ");
  alertBanner.hidden = false;
}

// ---------- Day/night theme ----------
// The <html data-theme> attribute is set before first paint by an inline
// script in index.html (reads localStorage, defaults to "light") so there's
// no flash of the wrong theme. This just wires the toggle button and
// re-renders the SVG charts, which bake in theme colors at draw time rather
// than reading CSS custom properties live.
const themeToggleBtn = document.getElementById("theme-toggle");

function applyThemeIcon() {
  themeToggleBtn.textContent = document.documentElement.dataset.theme === "light" ? "☀️" : "🌙";
}

function rerenderChartsForTheme() {
  if (document.getElementById("view-day").classList.contains("active")) {
    renderBarometer(barometerSvg, currentEntry.fog ?? null);
  }
  if (document.getElementById("view-patterns").classList.contains("active")) {
    loadPatterns();
  }
  if (document.getElementById("view-archive").classList.contains("active")) {
    reloadArchiveDetailForTheme();
  }
}

themeToggleBtn.addEventListener("click", () => {
  const next = document.documentElement.dataset.theme === "light" ? "dark" : "light";
  document.documentElement.dataset.theme = next;
  localStorage.setItem("theme", next);
  applyThemeIcon();
  rerenderChartsForTheme();
});

applyThemeIcon();

// ---------- Tabs ----------
document.querySelectorAll(".tab").forEach((btn) => {
  btn.addEventListener("click", () => switchView(btn.dataset.view));
});

function switchView(view) {
  document.querySelectorAll(".tab").forEach((b) => b.classList.toggle("active", b.dataset.view === view));
  document.querySelectorAll(".view").forEach((v) => v.classList.toggle("active", v.id === `view-${view}`));
  if (view === "month") loadMonth();
  if (view === "patterns") loadPatterns();
  if (view === "archive") loadArchiveList();
}

// ---------- Day view ----------
async function loadDay(dateKey) {
  dayDateInput.value = dateKey;
  const res = await fetch(`/api/entries/${dateKey}`);
  currentEntry = await res.json();

  for (const field of SCALE_FIELDS) {
    const input = document.getElementById(field);
    const value = typeof currentEntry[field] === "number" ? currentEntry[field] : 3;
    input.value = value;
    document.getElementById(`val-${field}`).textContent = value;
  }
  document.getElementById("notes").value = currentEntry.notes || "";

  renderReadingRow();
  renderBarometer(barometerSvg, currentEntry.fog ?? null);
  document.getElementById("save-status").textContent = "";
}

const TREND_DISPLAY_LABELS = { rising: "Rising", falling: "Falling", stable: "Stable", unsure: "Unsure" };

function renderReadingRow() {
  document.getElementById("reading-pressure").textContent =
    typeof currentEntry.pressureHpa === "number" ? `${currentEntry.pressureHpa} hPa` : "—";
  document.getElementById("reading-kp").textContent =
    typeof currentEntry.kpIndex === "number" ? currentEntry.kpIndex : "—";
  document.getElementById("reading-trend").textContent = currentEntry.trend
    ? TREND_DISPLAY_LABELS[currentEntry.trend] || currentEntry.trend
    : "—";
  document.getElementById("reading-time").textContent = currentEntry.readingAsOf
    ? new Date(currentEntry.readingAsOf).toLocaleString()
    : "—";
}

SCALE_FIELDS.forEach((field) => {
  document.getElementById(field).addEventListener("input", (e) => {
    document.getElementById(`val-${field}`).textContent = e.target.value;
    if (field === "fog") renderBarometer(barometerSvg, Number(e.target.value));
  });
});

dayDateInput.addEventListener("change", () => loadDay(dayDateInput.value));
document.getElementById("day-prev").addEventListener("click", () => loadDay(shiftDateKey(dayDateInput.value, -1)));
document.getElementById("day-next").addEventListener("click", () => loadDay(shiftDateKey(dayDateInput.value, 1)));

document.getElementById("save-entry").addEventListener("click", async () => {
  const body = {
    energy: Number(document.getElementById("energy").value),
    fog: Number(document.getElementById("fog").value),
    mood: Number(document.getElementById("mood").value),
    sleep: Number(document.getElementById("sleep").value),
    notes: document.getElementById("notes").value,
  };
  const btn = document.getElementById("save-entry");
  const status = document.getElementById("save-status");
  btn.disabled = true;
  status.textContent = "Saving and fetching live pressure & Kp-index…";
  try {
    const res = await fetch(`/api/entries/${dayDateInput.value}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Save failed");
    currentEntry = data.entry;
    renderReadingRow();
    renderBarometer(barometerSvg, currentEntry.fog ?? null);
    showAlerts(data.alerts);
    status.textContent = data.readingError ? `Saved. (Live reading unavailable: ${data.readingError})` : "Saved.";
    setTimeout(() => (status.textContent = ""), data.readingError ? 6000 : 2000);
  } catch (err) {
    status.textContent = `Error: ${err.message}`;
  } finally {
    btn.disabled = false;
  }
});

// ---------- Month view ----------
async function loadMonth() {
  const year = monthCursor.getFullYear();
  const month = monthCursor.getMonth();
  document.getElementById("month-label").textContent = monthCursor.toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });

  const res = await fetch("/api/entries");
  const entries = await res.json();
  const map = new Map(entries.map((e) => [e.date, e]));

  renderCalendar(document.getElementById("calendar-grid"), year, month, map, (dateKey) => {
    switchView("day");
    document.querySelector('.tab[data-view="day"]').classList.add("active");
    document.querySelector('.tab[data-view="month"]').classList.remove("active");
    document.getElementById("view-day").classList.add("active");
    document.getElementById("view-month").classList.remove("active");
    loadDay(dateKey);
  });
}

document.getElementById("month-prev").addEventListener("click", () => {
  monthCursor.setMonth(monthCursor.getMonth() - 1);
  loadMonth();
});
document.getElementById("month-next").addEventListener("click", () => {
  monthCursor.setMonth(monthCursor.getMonth() + 1);
  loadMonth();
});

// ---------- Patterns view ----------
async function loadPatterns() {
  const res = await fetch("/api/patterns");
  const data = await res.json();

  renderStatTiles(document.getElementById("wrapped-stats"), data.narrative.stats);

  renderPatternCharts({
    pressureEl: document.getElementById("chart-pressure"),
    kpEl: document.getElementById("chart-kp"),
    symptomsEl: document.getElementById("chart-symptoms"),
    symptomsLegendEl: document.getElementById("chart-symptoms-legend"),
    series: data.series,
  });

  renderCorrelationGroups(
    document.getElementById("correlations-weather"),
    document.getElementById("correlations-wellbeing"),
    data.correlations
  );
}

// ---------- Location dialog ----------
const locationDialog = document.getElementById("location-dialog");
const locationInput = document.getElementById("location-input");
const locationStatus = document.getElementById("location-status");
const locationLabel = document.getElementById("location-label");

async function loadConfig() {
  const res = await fetch("/api/config");
  const config = await res.json();
  locationLabel.textContent = config.location;
  return config;
}

document.getElementById("location-btn").addEventListener("click", async () => {
  const config = await loadConfig();
  locationInput.value = config.location;
  locationStatus.textContent = "";
  locationDialog.showModal();
});

document.getElementById("location-cancel").addEventListener("click", () => locationDialog.close());

document.getElementById("location-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  locationStatus.textContent = "Looking up location…";
  try {
    const res = await fetch("/api/config", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ location: locationInput.value }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Could not resolve location");
    locationLabel.textContent = data.location;
    locationDialog.close();
  } catch (err) {
    locationStatus.textContent = `Error: ${err.message}`;
  }
});

// ---------- Init ----------
(async function init() {
  await loadConfig();
  await loadDay(todayKey());
})();
