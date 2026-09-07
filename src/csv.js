const COLUMNS = [
  "date",
  "energy",
  "fog",
  "mood",
  "sleep",
  "trend",
  "notes",
  "pressureHpa",
  "pressureSource",
  "kpIndex",
  "readingAsOf",
];

function escapeCell(value) {
  if (value === undefined || value === null) return "";
  const str = String(value);
  if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

export function entriesToCsv(entries) {
  const lines = [COLUMNS.join(",")];
  for (const entry of entries) {
    lines.push(COLUMNS.map((col) => escapeCell(entry[col])).join(","));
  }
  return lines.join("\n") + "\n";
}
