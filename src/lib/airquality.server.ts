/**
 * Air quality from a blend of chemistry-transport models.
 *
 * Members:
 *  - CAMS global (ECMWF composition forecast, worldwide)
 *  - CAMS Europe regional ensemble (higher resolution, adds pollen)
 *
 * Pollutants present in both members are averaged; the US AQI is recomputed
 * locally from the blended concentrations using the EPA breakpoints, so the
 * number always matches the pollutant values we display.
 */

import type { AirQuality } from "./airquality";

const BASE = "https://air-quality-api.open-meteo.com/v1/air-quality";

const POLLUTANTS = "pm2_5,pm10,ozone,nitrogen_dioxide,sulphur_dioxide,carbon_monoxide";
const POLLEN = "grass_pollen,tree_pollen,weed_pollen";

type Member = Record<string, number | null>;

async function fetchMember(
  lat: number,
  lon: number,
  domain: "cams_global" | "cams_europe",
  withPollen: boolean,
): Promise<Member | null> {
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    current: withPollen ? `${POLLUTANTS},${POLLEN}` : POLLUTANTS,
    domains: domain,
    timezone: "auto",
  });
  try {
    const res = await fetch(`${BASE}?${params}`);
    if (!res.ok) return null;
    const d = (await res.json()) as { current?: Member };
    return d.current ?? null;
  } catch {
    return null;
  }
}

function avg(members: Array<Member | null>, key: string): number | null {
  const vals = members
    .map((m) => (m ? m[key] : null))
    .filter((v): v is number => typeof v === "number" && Number.isFinite(v));
  if (vals.length === 0) return null;
  return vals.reduce((s, v) => s + v, 0) / vals.length;
}

function piecewise(
  value: number,
  bp: Array<[number, number, number, number]>,
): number {
  for (const [cLo, cHi, iLo, iHi] of bp) {
    if (value <= cHi) return Math.round(((iHi - iLo) / (cHi - cLo)) * (value - cLo) + iLo);
  }
  return 500;
}

/** EPA US AQI from blended concentrations (µg/m³, ozone converted to ppb). */
function usAqiFrom(pm25: number | null, pm10: number | null, ozone: number | null): number | null {
  const sub: number[] = [];
  if (pm25 != null)
    sub.push(
      piecewise(pm25, [
        [0, 9, 0, 50],
        [9.1, 35.4, 51, 100],
        [35.5, 55.4, 101, 150],
        [55.5, 125.4, 151, 200],
        [125.5, 225.4, 201, 300],
        [225.5, 325.4, 301, 500],
      ]),
    );
  if (pm10 != null)
    sub.push(
      piecewise(pm10, [
        [0, 54, 0, 50],
        [55, 154, 51, 100],
        [155, 254, 101, 150],
        [255, 354, 151, 200],
        [355, 424, 201, 300],
        [425, 604, 301, 500],
      ]),
    );
  if (ozone != null) {
    const ppb = ozone / 1.96; // µg/m³ -> ppb at 25°C
    sub.push(
      piecewise(ppb, [
        [0, 54, 0, 50],
        [55, 70, 51, 100],
        [71, 85, 101, 150],
        [86, 105, 151, 200],
        [106, 200, 201, 300],
      ]),
    );
  }
  if (sub.length === 0) return null;
  return Math.max(...sub);
}

export async function buildBlendedAirQuality(lat: number, lon: number): Promise<AirQuality | null> {
  const [global, europe] = await Promise.all([
    fetchMember(lat, lon, "cams_global", false),
    fetchMember(lat, lon, "cams_europe", true),
  ]);
  if (!global && !europe) return null;

  const members = [global, europe];
  const pm25 = avg(members, "pm2_5");
  const pm10 = avg(members, "pm10");
  const ozone = avg(members, "ozone");

  return {
    usAqi: usAqiFrom(pm25, pm10, ozone),
    pm25,
    pm10,
    ozone,
    no2: avg(members, "nitrogen_dioxide"),
    so2: avg(members, "sulphur_dioxide"),
    co: avg(members, "carbon_monoxide"),
    grassPollen: europe ? (europe["grass_pollen"] ?? null) : null,
    treePollen: europe ? (europe["tree_pollen"] ?? null) : null,
    weedPollen: europe ? (europe["weed_pollen"] ?? null) : null,
  };
}
