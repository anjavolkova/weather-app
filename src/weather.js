const GEOCODE_URL = "https://geocoding-api.open-meteo.com/v1/search";
const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";

/** Resolve a free-text location name to coordinates via Open-Meteo geocoding. */
export async function geocode(name) {
  const url = new URL(GEOCODE_URL);
  url.searchParams.set("name", name);
  url.searchParams.set("count", "1");
  url.searchParams.set("language", "en");
  url.searchParams.set("format", "json");

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Geocoding failed: ${res.status}`);
  const data = await res.json();
  const result = data.results?.[0];
  if (!result) throw new Error(`No location found for "${name}"`);
  return { latitude: result.latitude, longitude: result.longitude, name: result.name };
}

/** Current sea-level pressure (hPa) for a coordinate pair. */
export async function fetchPressure(latitude, longitude) {
  const url = new URL(FORECAST_URL);
  url.searchParams.set("latitude", latitude);
  url.searchParams.set("longitude", longitude);
  url.searchParams.set("current", "pressure_msl");
  url.searchParams.set("timezone", "auto");

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Forecast fetch failed: ${res.status}`);
  const data = await res.json();
  const current = data.current;
  if (!current || typeof current.pressure_msl !== "number") {
    throw new Error("Forecast response missing current.pressure_msl");
  }
  return { pressureHpa: current.pressure_msl, time: current.time, source: "Open-Meteo" };
}
