/**
 * Lucast AI ensemble.
 *
 * Blends advanced numerical members (MET Norway / ECMWF global model and the
 * NOAA NWS gridpoint NBM guidance over the US) into a single hyperlocal
 * forecast trace. Open-Meteo is not used for any forecast data — geocoding
 * only.
 */

import { fetchMetNoHourly, type ModelHour } from "./metno.server";
import { fetchNwsHourly } from "./nws-grid.server";

export type EnsembleResult = {
  current: {
    temperature: number;
    apparent: number;
    humidity: number;
    pressure: number;
    windSpeed: number;
    windGust: number;
    windDirection: number;
    dewPoint: number;
    uvIndex: number;
    cloudCover: number;
    isDay: boolean;
    weatherCode: number;
  };
  daily: Array<{
    date: string;
    weatherCode: number;
    tMax: number;
    tMin: number;
    precipSum: number;
    precipProb: number;
    sunrise?: string;
    sunset?: string;
  }>;
  hourly: Array<{
    time: string;
    temp: number;
    precipProb: number;
    precip: number;
    weatherCode: number;
    windSpeed: number;
    windGust: number;
    apparent: number;
    humidity: number;
    dewPoint: number;
    pressure: number;
    uvIndex: number;
    isDay: boolean;
    cloudCover: number;
  }>;
  minutely: Array<{ time: string; precip: number; precipProb: number }>;
  utcOffsetSeconds: number;
};

// ---------------------------------------------------------------------------
// time helpers
// ---------------------------------------------------------------------------

function offsetSecondsFor(timezone: string | undefined, lon: number, atMs: number): number {
  if (timezone) {
    try {
      const dtf = new Intl.DateTimeFormat("en-US", {
        timeZone: timezone,
        hour12: false,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
      const parts = Object.fromEntries(
        dtf.formatToParts(new Date(atMs)).map((p) => [p.type, p.value]),
      ) as Record<string, string>;
      const asUtc = Date.UTC(
        Number(parts["year"]),
        Number(parts["month"]) - 1,
        Number(parts["day"]),
        Number(parts["hour"]) % 24,
        Number(parts["minute"]),
        Number(parts["second"]),
      );
      return Math.round((asUtc - Math.floor(atMs / 1000) * 1000) / 1000);
    } catch {
      /* fall through */
    }
  }
  return Math.round(lon / 15) * 3600;
}

/** Local naive ISO string ("YYYY-MM-DDTHH:mm") for a UTC ms instant. */
function localIso(ms: number, offsetSeconds: number, withMinutes = true): string {
  const d = new Date(ms + offsetSeconds * 1000);
  const s = d.toISOString();
  return withMinutes ? s.slice(0, 16) : s.slice(0, 10);
}

// ---------------------------------------------------------------------------
// solar geometry (NOAA algorithm) — sunrise/sunset without any 3rd-party API
// ---------------------------------------------------------------------------

function solarEvents(dateMs: number, lat: number, lon: number) {
  const rad = Math.PI / 180;
  const jDay = dateMs / 86400000 + 2440587.5;
  const n = Math.round(jDay - 2451545.0 + 0.0008 - lon / 360);
  const jStar = 2451545.0 + 0.0008 + n + lon / -360;
  const M = (357.5291 + 0.98560028 * (jStar - 2451545)) % 360;
  const C = 1.9148 * Math.sin(M * rad) + 0.02 * Math.sin(2 * M * rad) + 0.0003 * Math.sin(3 * M * rad);
  const lambda = (M + C + 180 + 102.9372) % 360;
  const jTransit = jStar + 0.0053 * Math.sin(M * rad) - 0.0069 * Math.sin(2 * lambda * rad);
  const delta = Math.asin(Math.sin(lambda * rad) * Math.sin(23.44 * rad));
  const cosOmega =
    (Math.sin(-0.833 * rad) - Math.sin(lat * rad) * Math.sin(delta)) /
    (Math.cos(lat * rad) * Math.cos(delta));
  if (cosOmega > 1 || cosOmega < -1) return null;
  const omega = Math.acos(cosOmega) / rad;
  const toMs = (j: number) => (j - 2440587.5) * 86400000;
  return {
    sunrise: toMs(jTransit - omega / 360),
    sunset: toMs(jTransit + omega / 360),
  };
}

// ---------------------------------------------------------------------------
// blending
// ---------------------------------------------------------------------------

function blend(members: ModelHour[][]): ModelHour[] {
  const primary = members[0];
  if (members.length === 1) return primary;
  const others = members.slice(1);
  return primary.map((h) => {
    const matches = others
      .map((m) => m.find((x) => Math.abs(x.timeMs - h.timeMs) < 30 * 60 * 1000))
      .filter((x): x is ModelHour => Boolean(x));
    if (matches.length === 0) return h;
    const all = [h, ...matches];
    const avg = (pick: (m: ModelHour) => number) =>
      all.reduce((s, m) => s + pick(m), 0) / all.length;
    return {
      ...h,
      temp: avg((m) => m.temp),
      dewPoint: avg((m) => m.dewPoint),
      humidity: avg((m) => m.humidity),
      windSpeed: avg((m) => m.windSpeed),
      windGust: Math.max(...all.map((m) => m.windGust)),
      precipProb: avg((m) => m.precipProb),
      // precipitation amount only comes from the global model member
      precip: h.precip,
      // strongest weather signal wins so convection is never averaged away
      weatherCode: all.some((m) => m.weatherCode >= 95)
        ? 95
        : h.weatherCode,
    };
  });
}

function apparentTemp(tempF: number, humidity: number, windMph: number): number {
  if (tempF <= 50 && windMph > 3) {
    const v = Math.pow(windMph, 0.16);
    return 35.74 + 0.6215 * tempF - 35.75 * v + 0.4275 * tempF * v;
  }
  if (tempF >= 80) {
    const T = tempF;
    const R = humidity;
    return (
      -42.379 + 2.04901523 * T + 10.14333127 * R - 0.22475541 * T * R -
      0.00683783 * T * T - 0.05481717 * R * R + 0.00122874 * T * T * R +
      0.00085282 * T * R * R - 0.00000199 * T * T * R * R
    );
  }
  return tempF;
}

export async function buildEnsembleForecast(
  lat: number,
  lon: number,
  forecastDays = 16,
  timezone?: string,
): Promise<EnsembleResult> {
  const [global, nws] = await Promise.all([
    fetchMetNoHourly(lat, lon),
    fetchNwsHourly(lat, lon),
  ]);

  const members: ModelHour[][] = [global];
  if (nws && nws.length > 0) members.push(nws);
  const merged = blend(members).sort((a, b) => a.timeMs - b.timeMs);

  const nowMs = Date.now();
  const offsetSeconds = offsetSecondsFor(timezone, lon, nowMs);

  const horizonMs = nowMs + Math.max(1, Math.min(16, forecastDays)) * 86400000;
  const hours = merged.filter((h) => h.timeMs >= nowMs - 3600000 && h.timeMs <= horizonMs);

  const sunToday = solarEvents(nowMs, lat, lon);
  const isDayAt = (ms: number) => {
    const ev = solarEvents(ms, lat, lon);
    if (!ev) return true;
    return ms >= ev.sunrise && ms <= ev.sunset;
  };

  const hourly = hours.map((h) => ({
    time: localIso(h.timeMs, offsetSeconds),
    temp: h.temp,
    precipProb: h.precipProb,
    precip: h.precip,
    weatherCode: h.weatherCode,
    windSpeed: h.windSpeed,
    windGust: h.windGust,
    apparent: apparentTemp(h.temp, h.humidity, h.windSpeed),
    humidity: h.humidity,
    dewPoint: h.dewPoint,
    pressure: h.pressure,
    uvIndex: h.uvIndex,
    isDay: isDayAt(h.timeMs),
    cloudCover: h.cloudCover,
  }));

  // ---- current conditions from the nearest-in-time ensemble hour ----
  const cur = merged.reduce((best, h) =>
    Math.abs(h.timeMs - nowMs) < Math.abs(best.timeMs - nowMs) ? h : best,
  merged[0]);

  const current = {
    temperature: cur.temp,
    apparent: apparentTemp(cur.temp, cur.humidity, cur.windSpeed),
    humidity: Math.round(cur.humidity),
    pressure: cur.pressure,
    windSpeed: cur.windSpeed,
    windGust: cur.windGust,
    windDirection: Math.round(cur.windDirection),
    dewPoint: cur.dewPoint,
    uvIndex: cur.uvIndex,
    cloudCover: Math.round(cur.cloudCover),
    isDay: sunToday ? nowMs >= sunToday.sunrise && nowMs <= sunToday.sunset : true,
    weatherCode: cur.weatherCode,
  };

  // ---- daily aggregation in local time ----
  const byDay = new Map<string, ModelHour[]>();
  for (const h of merged) {
    if (h.timeMs > horizonMs + 86400000) continue;
    const key = localIso(h.timeMs, offsetSeconds, false);
    const bucket = byDay.get(key);
    if (bucket) bucket.push(h);
    else byDay.set(key, [h]);
  }

  const daily = Array.from(byDay.entries())
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .slice(0, Math.max(1, Math.min(16, forecastDays)))
    .map(([date, list]) => {
      const dayHours = list.filter((h) => isDayAt(h.timeMs));
      const pool = dayHours.length > 0 ? dayHours : list;
      const wet = pool.filter((h) => h.precip > 0.004 || h.precipProb >= 40);
      const dominant = wet.length > 0
        ? wet.reduce((a, b) => (b.weatherCode > a.weatherCode ? b : a)).weatherCode
        : pool.reduce((a, b) => (b.cloudCover > a.cloudCover ? b : a)).weatherCode;
      const noonMs = Date.parse(`${date}T12:00:00Z`) - offsetSeconds * 1000;
      const ev = solarEvents(noonMs, lat, lon);
      return {
        date,
        weatherCode: dominant,
        tMax: Math.max(...list.map((h) => h.temp)),
        tMin: Math.min(...list.map((h) => h.temp)),
        precipSum: list.reduce((s, h) => s + h.precip, 0),
        precipProb: Math.round(Math.max(...list.map((h) => h.precipProb))),
        sunrise: ev ? localIso(ev.sunrise, offsetSeconds) : undefined,
        sunset: ev ? localIso(ev.sunset, offsetSeconds) : undefined,
      };
    });

  // ---- minute-level nowcast, downscaled from the ensemble hourly trace ----
  const minutely: Array<{ time: string; precip: number; precipProb: number }> = [];
  const upcoming = merged.filter((h) => h.timeMs >= nowMs - 3600000).slice(0, 3);
  if (upcoming.length >= 2) {
    for (let m = 0; m < 60; m++) {
      const tMs = nowMs + m * 60000;
      const i1 = upcoming.findIndex((h) => h.timeMs > tMs);
      const hi = i1 === -1 ? upcoming.length - 1 : i1;
      const lo = Math.max(0, hi - 1);
      const span = upcoming[hi].timeMs - upcoming[lo].timeMs || 1;
      const f = Math.max(0, Math.min(1, (tMs - upcoming[lo].timeMs) / span));
      const precip = ((upcoming[lo].precip / 60) * (1 - f) + (upcoming[hi].precip / 60) * f);
      const prob = upcoming[lo].precipProb * (1 - f) + upcoming[hi].precipProb * f;
      minutely.push({ time: new Date(tMs).toISOString(), precip, precipProb: prob });
    }
  }

  return { current, daily, hourly, minutely, utcOffsetSeconds: offsetSeconds };
}
