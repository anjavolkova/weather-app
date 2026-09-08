// Month calendar grid. Cells are colored by that day's barometric pressure
// (green = high/fair, rust = low/stormy — same ramp used for fog severity
// elsewhere, so the color language stays consistent app-wide) and show fog,
// energy, and geomagnetic activity numerically so a pattern across the month
// is visible without opening each day.
const STORM_KP = 5;

// Low pressure -> rust (unsettled), high pressure -> green (fair). Buckets
// centered loosely on standard sea-level pressure (1013.25 hPa).
const PRESSURE_BUCKETS = [
  { max: 1000, color: "#B1503F" },
  { max: 1008, color: "#C4824D" },
  { max: 1016, color: "#C69A4E" },
  { max: 1024, color: "#9AAE72" },
  { max: Infinity, color: "#6FA87E" },
];

function pressureColor(hpa) {
  return PRESSURE_BUCKETS.find((bucket) => hpa <= bucket.max).color;
}

function toDateKey(year, month, day) {
  const mm = String(month + 1).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  return `${year}-${mm}-${dd}`;
}

function buildDayCell(day, entry, isToday) {
  const cell = document.createElement("button");
  cell.className = "day-cell";
  if (isToday) cell.classList.add("today");

  const hasPressure = entry && typeof entry.pressureHpa === "number";
  if (hasPressure) {
    cell.style.background = pressureColor(entry.pressureHpa);
    cell.classList.add("has-data");
    cell.title = `Pressure ${entry.pressureHpa} hPa`;
  }

  const top = document.createElement("div");
  top.className = "day-cell-top";
  const dayNum = document.createElement("span");
  dayNum.className = "day-num";
  dayNum.textContent = day;
  top.appendChild(dayNum);

  if (entry && typeof entry.kpIndex === "number") {
    const isStorm = entry.kpIndex >= STORM_KP;
    const kpBadge = document.createElement("span");
    kpBadge.className = "day-kp-badge" + (isStorm ? " storm" : "");
    kpBadge.textContent = `${isStorm ? "⚡" : ""}K${entry.kpIndex}`;
    kpBadge.title = `Kp-index ${entry.kpIndex}${isStorm ? " — geomagnetic storm" : ""}`;
    top.appendChild(kpBadge);
  }
  cell.appendChild(top);

  if (entry && (typeof entry.fog === "number" || typeof entry.energy === "number")) {
    const bottom = document.createElement("div");
    bottom.className = "day-cell-bottom";
    if (typeof entry.fog === "number") {
      const fog = document.createElement("span");
      fog.textContent = `F${entry.fog}`;
      fog.title = `Fog ${entry.fog}/5`;
      bottom.appendChild(fog);
    }
    if (typeof entry.energy === "number") {
      const energy = document.createElement("span");
      energy.textContent = `E${entry.energy}`;
      energy.title = `Energy ${entry.energy}/5`;
      bottom.appendChild(energy);
    }
    cell.appendChild(bottom);
  }

  return cell;
}

/**
 * Render a month grid into `container`.
 * entriesByDate: Map<string, entry>
 * onDayClick: (dateKey) => void
 */
function renderCalendar(container, year, month, entriesByDate, onDayClick) {
  container.innerHTML = "";
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayKey = toDateKey(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());

  for (let i = 0; i < firstDay; i++) {
    const filler = document.createElement("div");
    filler.className = "day-cell empty";
    container.appendChild(filler);
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const key = toDateKey(year, month, day);
    const entry = entriesByDate.get(key);
    const cell = buildDayCell(day, entry, key === todayKey);
    cell.addEventListener("click", () => onDayClick(key));
    container.appendChild(cell);
  }
}
