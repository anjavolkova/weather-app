const KP_URL = "https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json";

/**
 * NOAA's documented shape is rows-as-arrays: [["time_tag","Kp",...], [value, value, ...], ...].
 * Some SWPC products instead hand back rows-as-objects ({time_tag, kp_index, ...}); accept
 * either so an upstream format tweak degrades to a clear error instead of a cryptic
 * "object is not iterable" crash from blind array-destructuring.
 */
function parseRow(row) {
  if (Array.isArray(row)) {
    const [time_tag, kp] = row;
    return { time_tag, kp };
  }
  if (row && typeof row === "object") {
    const time_tag = row.time_tag ?? row.time;
    const kp = row.Kp ?? row.kp ?? row.kp_index ?? row.estimated_kp;
    return { time_tag, kp };
  }
  throw new Error(`Kp-index response row had an unrecognized shape: ${JSON.stringify(row)}`);
}

/** Latest planetary Kp-index reading from NOAA SWPC. */
export async function fetchKpIndex() {
  const res = await fetch(KP_URL);
  if (!res.ok) throw new Error(`Kp-index fetch failed: ${res.status}`);
  const rows = await res.json();
  if (!Array.isArray(rows) || rows.length < 2) {
    throw new Error("Kp-index response had no data rows");
  }
  const { time_tag, kp } = parseRow(rows[rows.length - 1]);
  const kpIndex = parseFloat(kp);
  if (!time_tag || Number.isNaN(kpIndex)) {
    throw new Error(`Kp-index response row was missing time_tag/kp: ${JSON.stringify(rows[rows.length - 1])}`);
  }
  return { kpIndex, time: time_tag };
}
