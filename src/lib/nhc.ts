/**
 * National Hurricane Center data layer.
 *
 * All endpoints are public NOAA/NHC URLs. Centralised here so the UI
 * components only deal with typed data and never bake URLs in.
 */

export type Basin = "atlantic" | "eastpacific" | "centralpacific";
export type OutlookRange = "2d" | "7d";

export const BASIN_LABEL: Record<Basin, string> = {
  atlantic: "Atlantic",
  eastpacific: "E. Pacific",
  centralpacific: "C. Pacific",
};

const OUTLOOK_PATH: Record<Basin, string> = {
  atlantic: "atl",
  eastpacific: "pac",
  centralpacific: "cpac",
};

export const NHC_CURRENT_STORMS_URL =
  "https://www.nhc.noaa.gov/CurrentStorms.json";

export function outlookImageUrl(
  basin: Basin,
  range: OutlookRange,
  cacheBust?: string | number,
): string {
  const base = `https://www.nhc.noaa.gov/xgtwo/two_${OUTLOOK_PATH[basin]}_${range}0.png`;
  return cacheBust ? `${base}?t=${cacheBust}` : base;
}

export function outlookExternalUrl(basin: Basin, range: OutlookRange): string {
  return `https://www.nhc.noaa.gov/gtwo.php?basin=${basin}&fdays=${range === "7d" ? 7 : 2}`;
}

export type NHCStorm = {
  id: string;
  binNumber: string;
  name: string;
  classification: string;
  intensity: string;
  pressure: string;
  latitude: string;
  longitude: string;
  latitudeNumeric: number;
  longitudeNumeric: number;
  movementDir: number;
  movementSpeed: number;
  lastUpdate: string;
  publicAdvisory?: { advNum: string; issuance: string; url: string };
  forecastTrack?: { kmzFile?: string; zipFile?: string };
  forecastConeGraphic?: { url: string };
  trackAndWatchesWarnings?: { url: string };
};

export function stormBasin(id: string): Basin {
  if (id.startsWith("AL")) return "atlantic";
  if (id.startsWith("EP")) return "eastpacific";
  if (id.startsWith("CP")) return "centralpacific";
  return "atlantic";
}

export async function fetchActiveStorms(signal?: AbortSignal): Promise<NHCStorm[]> {
  const r = await fetch(NHC_CURRENT_STORMS_URL, { cache: "no-store", signal });
  if (!r.ok) throw new Error("NHC unavailable");
  const d = await r.json();
  if (!Array.isArray(d?.activeStorms)) return [];
  return d.activeStorms.map((s: any) => ({
    id: s.id,
    binNumber: s.binNumber,
    name: s.name,
    classification: s.classification,
    intensity: s.intensity,
    pressure: s.pressure,
    latitude: s.latitude,
    longitude: s.longitude,
    latitudeNumeric: Number(s.latitudeNumeric ?? 0),
    longitudeNumeric: Number(s.longitudeNumeric ?? 0),
    movementDir: Number(s.movementDir ?? 0),
    movementSpeed: Number(s.movementSpeed ?? 0),
    lastUpdate: s.lastUpdate,
    publicAdvisory: s.publicAdvisory,
    forecastTrack: s.forecastTrack,
    forecastConeGraphic: s.forecastConeGraphic,
    trackAndWatchesWarnings: s.trackAndWatchesWarnings,
  }));
}
