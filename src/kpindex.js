const KP_URL = "https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json";

/**
 * Latest planetary Kp-index reading from NOAA SWPC.
 * Response shape: [["time_tag","Kp","a_running","station_count"], [row...], ...]
 * with the header as row 0 and the most recent reading as the last row.
 */
export async function fetchKpIndex() {
  const res = await fetch(KP_URL);
  if (!res.ok) throw new Error(`Kp-index fetch failed: ${res.status}`);
  const rows = await res.json();
  if (!Array.isArray(rows) || rows.length < 2) {
    throw new Error("Kp-index response had no data rows");
  }
  const [time_tag, kp] = rows[rows.length - 1];
  return { kpIndex: parseFloat(kp), time: time_tag };
}
