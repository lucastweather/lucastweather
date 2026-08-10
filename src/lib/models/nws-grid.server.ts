/**
 * NOAA/NWS gridpoint hourly forecast (NBM / NDFD) ingest — the US member of
 * the Lucast AI ensemble.
 */

import type { ModelHour } from "./metno.server";

const NWS = "https://api.weather.gov";
const HEADERS = { Accept: "application/geo+json", "User-Agent": "LucastWeather/1.0" };

const cToF = (c: number) => c * 1.8 + 32;

function parseSpeed(v: string | null | undefined): number {
  if (!v) return 0;
  const m = /([\d.]+)\s*(?:to\s*([\d.]+))?\s*(mph|km\/h)?/i.exec(v);
  if (!m) return 0;
  const hi = Number(m[2] ?? m[1]);
  return m[3]?.toLowerCase() === "km/h" ? hi * 0.621371 : hi;
}

function codeFromShortForecast(text: string, cloud: number): number {
  const t = text.toLowerCase();
  if (t.includes("thunder")) return 95;
  if (t.includes("snow")) return t.includes("heavy") ? 75 : 73;
  if (t.includes("sleet") || t.includes("freezing")) return 66;
  if (t.includes("drizzle")) return 51;
  if (t.includes("heavy rain")) return 65;
  if (t.includes("shower")) return 80;
  if (t.includes("rain")) return 63;
  if (t.includes("fog") || t.includes("haze")) return 45;
  if (t.includes("overcast") || cloud >= 88) return 3;
  if (t.includes("mostly cloudy") || t.includes("partly sunny")) return 2;
  if (t.includes("partly cloudy") || t.includes("mostly sunny")) return 1;
  if (t.includes("clear") || t.includes("sunny")) return 0;
  return 2;
}

export async function fetchNwsHourly(lat: number, lon: number): Promise<ModelHour[] | null> {
  try {
    const pt = await fetch(`${NWS}/points/${lat.toFixed(4)},${lon.toFixed(4)}`, {
      headers: HEADERS,
    });
    if (!pt.ok) return null;
    const meta = (await pt.json()) as { properties?: { forecastHourly?: string } };
    const url = meta.properties?.forecastHourly;
    if (!url) return null;
    const res = await fetch(url, { headers: HEADERS });
    if (!res.ok) return null;
    const json = (await res.json()) as {
      properties?: {
        periods?: Array<{
          startTime: string;
          temperature: number;
          temperatureUnit: string;
          probabilityOfPrecipitation?: { value: number | null };
          dewpoint?: { value: number | null };
          relativeHumidity?: { value: number | null };
          windSpeed?: string;
          windGust?: string;
          windDirection?: string;
          shortForecast?: string;
        }>;
      };
    };
    const periods = json.properties?.periods ?? [];
    if (periods.length === 0) return null;

    const dirs: Record<string, number> = {
      N: 0, NNE: 22, NE: 45, ENE: 68, E: 90, ESE: 113, SE: 135, SSE: 158,
      S: 180, SSW: 203, SW: 225, WSW: 248, W: 270, WNW: 293, NW: 315, NNW: 338,
    };

    return periods.map((p) => {
      const temp = p.temperatureUnit === "C" ? cToF(p.temperature) : p.temperature;
      const text = p.shortForecast ?? "";
      const cloud = /overcast|cloudy/i.test(text) ? 90 : /partly/i.test(text) ? 45 : 10;
      const wind = parseSpeed(p.windSpeed);
      return {
        timeMs: Date.parse(p.startTime),
        temp,
        dewPoint: p.dewpoint?.value !== null && p.dewpoint?.value !== undefined
          ? cToF(p.dewpoint.value)
          : temp - 8,
        humidity: p.relativeHumidity?.value ?? 0,
        pressure: 29.92,
        windSpeed: wind,
        windGust: parseSpeed(p.windGust) || wind * 1.4,
        windDirection: dirs[p.windDirection ?? "N"] ?? 0,
        cloudCover: cloud,
        uvIndex: 0,
        precip: 0,
        precipProb: p.probabilityOfPrecipitation?.value ?? 0,
        weatherCode: codeFromShortForecast(text, cloud),
      } satisfies ModelHour;
    });
  } catch {
    return null;
  }
}
