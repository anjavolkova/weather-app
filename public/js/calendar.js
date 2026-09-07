// Month calendar grid, cells colored by that day's fog severity.
const FOG_COLORS_CAL = {
  1: "#6FA87E",
  2: "#9AAE72",
  3: "#C69A4E",
  4: "#C4824D",
  5: "#B1503F",
};

function toDateKey(year, month, day) {
  const mm = String(month + 1).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  return `${year}-${mm}-${dd}`;
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
    const cell = document.createElement("button");
    cell.className = "day-cell";
    if (key === todayKey) cell.classList.add("today");
    cell.textContent = day;
    if (entry && typeof entry.fog === "number") {
      cell.style.background = FOG_COLORS_CAL[Math.round(entry.fog)];
      cell.style.color = "#10151c";
      cell.style.fontWeight = "600";
    }
    cell.addEventListener("click", () => onDayClick(key));
    container.appendChild(cell);
  }
}
