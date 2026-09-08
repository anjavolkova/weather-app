// Archive tab: a list of past calendar months, each opening into a full
// per-month patterns detail (reusing the same rendering helpers as the
// Patterns tab, via shared.js) plus an AI-generated summary. Generation is
// fully automatic — see src/scheduler.js — there's no button here; this
// just displays whatever's already cached, or explains why nothing's there yet.

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
  content.innerHTML = "";

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
    return;
  }

  const placeholder = document.createElement("p");
  placeholder.className = "hint";
  if (data.entryCount === 0) {
    placeholder.textContent = "No entries logged this month.";
  } else if (!data.isComplete) {
    placeholder.textContent = "This month is still in progress. Its AI summary is generated automatically once the month ends.";
  } else {
    placeholder.textContent =
      "Not generated yet. This happens automatically the next time the server is running with an AI provider (Ollama or Anthropic) configured — see the README.";
  }
  content.appendChild(placeholder);
}

document.getElementById("archive-back").addEventListener("click", showArchiveList);
