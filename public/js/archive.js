// Archive tab: a list of past calendar months, each opening into a full
// per-month patterns detail (reusing the same rendering helpers as the
// Patterns tab, via shared.js) plus an on-demand AI-generated summary.
let currentArchiveMonth = null;

function showArchiveList() {
  document.getElementById("archive-list-view").hidden = false;
  document.getElementById("archive-detail-view").hidden = true;
}

function showArchiveDetail() {
  document.getElementById("archive-list-view").hidden = true;
  document.getElementById("archive-detail-view").hidden = false;
}

async function loadArchiveList() {
  showArchiveList();
  const res = await fetch("/api/months");
  const months = await res.json();

  const listEl = document.getElementById("archive-list");
  const emptyEl = document.getElementById("archive-empty");
  listEl.innerHTML = "";

  if (months.length < 2) {
    emptyEl.hidden = false;
    listEl.hidden = true;
    return;
  }
  emptyEl.hidden = true;
  listEl.hidden = false;

  const currentMonth = todayKey().slice(0, 7);
  for (const m of months) {
    const card = document.createElement("button");
    card.className = "archive-card";
    const title = document.createElement("div");
    title.className = "archive-card-title";
    title.textContent = m.month === currentMonth ? `${m.label} (in progress)` : m.label;
    const meta = document.createElement("div");
    meta.className = "archive-card-meta";
    meta.textContent = `${m.count} day${m.count === 1 ? "" : "s"} logged`;
    card.append(title, meta);
    card.addEventListener("click", () => openArchiveMonth(m.month));
    listEl.appendChild(card);
  }
}

async function openArchiveMonth(month) {
  currentArchiveMonth = month;
  showArchiveDetail();
  await loadArchiveDetail(month);
}

async function loadArchiveDetail(month) {
  const res = await fetch(`/api/months/${month}`);
  const data = await res.json();

  document.getElementById("archive-detail-headline").textContent = `${data.label} — ${data.narrative.headline}`;
  renderStatTiles(document.getElementById("archive-detail-stats"), data.narrative.stats);
  renderParagraphs(document.getElementById("archive-detail-paragraphs"), data.narrative.paragraphs);

  renderCorrelationGroups(
    document.getElementById("archive-correlations-weather"),
    document.getElementById("archive-correlations-wellbeing"),
    data.correlations
  );

  renderPatternCharts({
    pressureEl: document.getElementById("archive-chart-pressure"),
    kpEl: document.getElementById("archive-chart-kp"),
    symptomsEl: document.getElementById("archive-chart-symptoms"),
    symptomsLegendEl: document.getElementById("archive-chart-symptoms-legend"),
    series: data.series,
  });

  renderAiSummarySection(data);
}

function renderAiSummarySection(data) {
  const content = document.getElementById("archive-ai-summary-content");
  const btn = document.getElementById("archive-generate-ai");
  const status = document.getElementById("archive-ai-status");
  content.innerHTML = "";
  status.textContent = "";

  if (data.aiSummary) {
    for (const para of data.aiSummary.summary.split(/\n+/).map((p) => p.trim()).filter(Boolean)) {
      const p = document.createElement("p");
      p.textContent = para;
      content.appendChild(p);
    }
    const meta = document.createElement("p");
    meta.className = "hint";
    meta.textContent = `Generated ${new Date(data.aiSummary.generatedAt).toLocaleString()}`;
    content.appendChild(meta);
    btn.textContent = "Regenerate";
  } else {
    const placeholder = document.createElement("p");
    placeholder.className = "hint";
    placeholder.textContent = data.entryCount === 0 ? "No entries logged this month." : "No summary yet.";
    content.appendChild(placeholder);
    btn.textContent = data.isComplete ? "Generate AI summary" : "Generate summary so far";
  }
  btn.disabled = data.entryCount === 0;
}

document.getElementById("archive-back").addEventListener("click", showArchiveList);

document.getElementById("archive-generate-ai").addEventListener("click", async () => {
  if (!currentArchiveMonth) return;
  const btn = document.getElementById("archive-generate-ai");
  const status = document.getElementById("archive-ai-status");
  btn.disabled = true;
  status.textContent = "Generating — this calls the Anthropic API and can take a few seconds…";
  try {
    const res = await fetch(`/api/months/${currentArchiveMonth}/ai-summary`, { method: "POST" });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to generate summary");
    status.textContent = "";
    await loadArchiveDetail(currentArchiveMonth);
  } catch (err) {
    status.textContent = `Error: ${err.message}`;
    btn.disabled = false;
  }
});
