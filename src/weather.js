import { weatherCodeLabel } from "./weatherCodes.js";

const GEOCODE_URL = "https://geocoding-api.open-meteo.com/v1/search";
const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";
const ARCHIVE_URL = "https://archive-api.open-meteo.com/v1/archive";

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

/** Current pressure (hPa), weather condition, and temperature for a coordinate pair. */
export async function fetchCurrentConditions(latitude, longitude) {
  const url = new URL(FORECAST_URL);
  url.searchParams.set("latitude", latitude);
  url.searchParams.set("longitude", longitude);
  url.searchParams.set("current", "pressure_msl,weather_code,temperature_2m");
  url.searchParams.set("timezone", "auto");

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Forecast fetch failed: ${res.status}`);
  const data = await res.json();
  const current = data.current;
  if (!current || typeof current.pressure_msl !== "number") {
    throw new Error("Forecast response missing current.pressure_msl");
  }
  return {
    pressureHpa: current.pressure_msl,
    weatherCode: typeof current.weather_code === "number" ? current.weather_code : null,
    condition: weatherCodeLabel(current.weather_code),
    temperatureC: typeof current.temperature_2m === "number" ? current.temperature_2m : null,
    time: current.time,
    source: "Open-Meteo",
  };
}

/**
 * Historical daily weather condition + temperature for a date range, via
 * Open-Meteo's archive (ERA5 reanalysis) API — used to backfill days logged
 * before live weather fetching was added. Returns { "YYYY-MM-DD": {...} }.
 * temperatureC is the midpoint of that day's high/low (the archive API's
 * daily block has no single "mean" field) — a reasonable daily approximation,
 * not an hourly reading like the live current-conditions fetch.
 */
export async function fetchHistoricalConditions(latitude, longitude, startDate, endDate) {
  const url = new URL(ARCHIVE_URL);
  url.searchParams.set("latitude", latitude);
  url.searchParams.set("longitude", longitude);
  url.searchParams.set("start_date", startDate);
  url.searchParams.set("end_date", endDate);
  url.searchParams.set("daily", "weather_code,temperature_2m_max,temperature_2m_min");
  url.searchParams.set("timezone", "auto");

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Historical weather fetch failed: ${res.status}`);
  const data = await res.json();
  const daily = data.daily;
  if (!daily || !Array.isArray(daily.time)) {
    throw new Error("Historical weather response missing daily data");
  }

  const byDate = {};
  daily.time.forEach((date, i) => {
    const code = daily.weather_code?.[i];
    const max = daily.temperature_2m_max?.[i];
    const min = daily.temperature_2m_min?.[i];
    const hasRange = typeof max === "number" && typeof min === "number";
    byDate[date] = {
      weatherCode: typeof code === "number" ? code : null,
      condition: weatherCodeLabel(code),
      temperatureC: hasRange ? Math.round(((max + min) / 2) * 10) / 10 : null,
    };
  });
  return byDate;
}
