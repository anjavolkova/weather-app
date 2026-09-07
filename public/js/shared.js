// Rendering helpers shared between the Patterns view (trailing 30 days) and
// the Archive view (one calendar month at a time) — both show the same
// shapes of data (narrative stats/paragraphs, grouped correlations, the
// three time-series charts), just for a different slice of entries.

const CORR_LABELS = {
  pressureHpa: "Pressure",
  kpIndex: "Kp-index",
  energy: "Energy",
  sleep: "Sleep",
  mood: "Mood",
};

const SYMPTOM_LINES = [
  { key: "fog", label: "Fog", color: "#3987e5" },
  { key: "energy", label: "Energy", color: "#d95926" },
  { key: "mood", label: "Mood", color: "#199e70" },
  { key: "sleep", label: "Sleep", color: "#c98500" },
];

// Pressure has no fixed scale (unlike Kp 0-9 or the 1-5 symptom scales), so
// its chart domain is derived from the data, padded and rounded to a clean step.
function pressureDomain(series) {
  const values = series.map((p) => p.pressureHpa).filter((v) => typeof v === "number");
  if (values.length === 0) return { domain: [990, 1030], ticks: [990, 1010, 1030] };
  const min = Math.floor(Math.min(...values) / 5) * 5 - 5;
  const max = Math.ceil(Math.max(...values) / 5) * 5 + 5;
  const mid = Math.round((min + max) / 2 / 5) * 5;
  return { domain: [min, max], ticks: [min, mid, max] };
}

function renderStatTiles(container, stats) {
  container.innerHTML = "";
  for (const stat of stats) {
    const tile = document.createElement("div");
    tile.className = "stat-tile";
    const label = document.createElement("span");
    label.className = "stat-label";
    label.textContent = stat.label;
    const value = document.createElement("span");
    value.className = "stat-value";
    value.textContent = stat.value;
    tile.append(label, value);
    container.appendChild(tile);
  }
}

function renderParagraphs(container, paragraphs) {
  container.innerHTML = "";
  for (const paragraph of paragraphs) {
    const p = document.createElement("p");
    p.textContent = paragraph;
    container.appendChild(p);
  }
}

function renderCorrelationGroups(weatherContainer, wellbeingContainer, correlations) {
  weatherContainer.innerHTML = "";
  wellbeingContainer.innerHTML = "";
  for (const [key, { r, n }] of Object.entries(correlations)) {
    const card = document.createElement("div");
    card.className = "corr-card";
    const label = document.createElement("div");
    label.className = "corr-label";
    label.textContent = CORR_LABELS[key] || key;
    const value = document.createElement("div");
    value.className = "corr-value";
    value.textContent = r == null ? "—" : r.toFixed(2);
    const nEl = document.createElement("div");
    nEl.className = "corr-n";
    nEl.textContent = r == null ? `Need ≥5 days (n=${n})` : `n=${n}`;
    card.append(label, value, nEl);
    const container = key === "pressureHpa" || key === "kpIndex" ? weatherContainer : wellbeingContainer;
    container.appendChild(card);
  }
}

function renderPatternCharts({ pressureEl, kpEl, symptomsEl, symptomsLegendEl, series }) {
  const { domain: pDomain, ticks: pTicks } = pressureDomain(series);
  renderTimeSeriesChart(pressureEl, {
    series,
    lines: [{ key: "pressureHpa", label: "Pressure", color: "#C69A4E" }],
    yDomain: pDomain,
    yTicks: pTicks,
    unit: " hPa",
    decimals: 1,
  });

  renderTimeSeriesChart(kpEl, {
    series,
    lines: [{ key: "kpIndex", label: "Kp-index", color: "#9085e9" }],
    yDomain: [0, 9],
    yTicks: [0, 3, 6, 9],
    threshold: { value: 5, label: "Storm ≥5", color: "#B1503F" },
    decimals: 1,
  });

  renderTimeSeriesChart(symptomsEl, {
    series,
    lines: SYMPTOM_LINES,
    yDomain: [1, 5],
    yTicks: [1, 3, 5],
    unit: "/5",
    decimals: 0,
    legendEl: symptomsLegendEl,
  });
}
