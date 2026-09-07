// Month calendar grid. Cells are colored by that day's fog severity and show
// a few other logged values at a glance (pressure trend, mood) so a pattern
// across the month is visible without opening each day.
const FOG_COLORS_CAL = {
  1: "#6FA87E",
  2: "#9AAE72",
  3: "#C69A4E",
  4: "#C4824D",
  5: "#B1503F",
};

const TREND_ARROWS = { rising: "↑", falling: "↓", stable: "→", unsure: "·" };

function toDateKey(year, month, day) {
  const mm = String(month + 1).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  return `${year}-${mm}-${dd}`;
}

function buildDayCell(day, entry, isToday) {
  const cell = document.createElement("button");
  cell.className = "day-cell";
  if (isToday) cell.classList.add("today");

  const hasFog = entry && typeof entry.fog === "number";
  if (hasFog) {
    cell.style.background = FOG_COLORS_CAL[Math.round(entry.fog)];
    cell.classList.add("has-data");
  }

  const top = document.createElement("div");
  top.className = "day-cell-top";
  const dayNum = document.createElement("span");
  dayNum.className = "day-num";
  dayNum.textContent = day;
  top.appendChild(dayNum);
  if (hasFog) {
    const fogBadge = document.createElement("span");
    fogBadge.className = "day-fog-badge";
    fogBadge.textContent = `F${entry.fog}`;
    fogBadge.title = `Fog ${entry.fog}/5`;
    top.appendChild(fogBadge);
  }
  cell.appendChild(top);

  if (entry && (typeof entry.pressureHpa === "number" || typeof entry.mood === "number")) {
    const bottom = document.createElement("div");
    bottom.className = "day-cell-bottom";

    if (typeof entry.pressureHpa === "number") {
      const pressure = document.createElement("span");
      pressure.className = "day-pressure";
      const arrow = TREND_ARROWS[entry.trend] || "";
      pressure.textContent = `${arrow}${Math.round(entry.pressureHpa)}`;
      pressure.title = `Pressure ${entry.pressureHpa} hPa, ${entry.trend || "unsure"}`;
      bottom.appendChild(pressure);
    }
    if (typeof entry.mood === "number") {
      const mood = document.createElement("span");
      mood.className = "day-mood";
      mood.textContent = `M${entry.mood}`;
      mood.title = `Mood ${entry.mood}/5`;
      bottom.appendChild(mood);
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
