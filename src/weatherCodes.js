// WMO weather interpretation codes (WW code table 4677), as used by
// Open-Meteo's `weather_code` field on both the current-conditions and
// historical archive endpoints.
const WMO_LABELS = {
  0: "Clear sky",
  1: "Mainly clear",
  2: "Partly cloudy",
  3: "Overcast",
  45: "Fog",
  48: "Depositing rime fog",
  51: "Light drizzle",
  53: "Moderate drizzle",
  55: "Dense drizzle",
  56: "Light freezing drizzle",
  57: "Dense freezing drizzle",
  61: "Slight rain",
  63: "Moderate rain",
  65: "Heavy rain",
  66: "Light freezing rain",
  67: "Heavy freezing rain",
  71: "Slight snow fall",
  73: "Moderate snow fall",
  75: "Heavy snow fall",
  77: "Snow grains",
  80: "Slight rain showers",
  81: "Moderate rain showers",
  82: "Violent rain showers",
  85: "Slight snow showers",
  86: "Heavy snow showers",
  95: "Thunderstorm",
  96: "Thunderstorm with slight hail",
  99: "Thunderstorm with heavy hail",
};

export function weatherCodeLabel(code) {
  return WMO_LABELS[code] ?? (typeof code === "number" ? `Unknown (code ${code})` : null);
}

// Drizzle, rain, rain showers, and thunderstorms — deliberately excludes the
// snow codes (71-86) since "rain/storm" is about precipitation type, not
// just any precipitation.
const RAIN_STORM_CODES = new Set([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82, 95, 96, 99]);

export function isRainOrStorm(code) {
  return RAIN_STORM_CODES.has(code);
}
