/**
 * NOAA/NWS surface observation ingest.
 *
 * Current conditions are taken from the nearest official NOAA ASOS/AWOS
 * weather station (api.weather.gov) rather than a numerical model, then fed
 * into the Lucast hyperlocal post-processing layer, which bias-corrects the
 * short-range model output toward the live observation.
 */

export type StationObservation = {
  stationId: string;
  stationName: string;
  observedAt: string;
  distanceMi: number | null;
  temperature: number | null; // °F
  dewPoint: number | null; // °F
  apparent: number | null; // °F
  humidity: number | null; // %
  pressure: number | null; // inHg
  windSpeed: number | null; // mph
  windGust: number | null; // mph
  windDirection: number | null; // deg
  cloudCover: number | null; // %
  weatherCode: number | null;
  textDescription: string | null;
};

const NWS = "https://api.weather.gov";
const HEADERS = { Accept: "application/geo+json" };

const cToF = (c: number) => c * 1.8 + 32;
const msToMph = (m: number) => m * 2.236936;
const kmhToMph = (k: number) => k * 0.621371;
const paToInHg = (p: number) => p / 3386.389;

function value(node: unknown): number | null {
  const v = node as { value?: number | null; unitCode?: string } | null | undefined;
  if (!v || v.value === null || v.value === undefined || !Number.isFinite(v.value)) return null;
  return v.value;
}

function speedMph(node: unknown): number | null {
  const v = node as { value?: number | null; unitCode?: string } | null | undefined;
  const raw = value(node);
  if (raw === null) return null;
  return v?.unitCode?.includes("km_h-1") ? kmhToMph(raw) : msToMph(raw);
}

const CLOUD_PCT: Record<string, number> = {
  CLR: 0,
  SKC: 0,
  FEW: 20,
  SCT: 45,
  BKN: 75,
  OVC: 100,
  VV: 100,
};

function cloudCoverFromLayers(layers: Array<{ amount?: string }> | undefined): number | null {
  if (!layers || layers.length === 0) return null;
  let max = 0;
  for (const l of layers) {
    const pct = CLOUD_PCT[l.amount ?? ""] ?? 0;
    if (pct > max) max = pct;
  }
  return max;
}

/** Maps an METAR text description to the shared WMO-ish weather code space. */
export function codeFromDescription(text: string | null, cloudCover: number | null): number | null {
  if (!text) return null;
  const t = text.toLowerCase();
  if (t.includes("thunder")) return t.includes("hail") ? 96 : 95;
  if (t.includes("freezing rain") || t.includes("freezing drizzle")) return 66;
  if (t.includes("snow") || t.includes("flurr")) return t.includes("heavy") ? 75 : 73;
  if (t.includes("drizzle")) return 53;
  if (t.includes("shower")) return t.includes("heavy") ? 82 : 80;
  if (t.includes("rain")) return t.includes("heavy") ? 65 : t.includes("light") ? 61 : 63;
  if (t.includes("fog") || t.includes("mist")) return 45;
  if (t.includes("haze") || t.includes("smoke") || t.includes("dust")) return 45;
  if (t.includes("overcast")) return 3;
  if (t.includes("mostly cloudy") || t.includes("broken")) return 3;
  if (t.includes("partly") || t.includes("scattered")) return 2;
  if (t.includes("few")) return 1;
  if (t.includes("clear") || t.includes("fair") || t.includes("sunny")) return 0;
  if (cloudCover !== null) {
    if (cloudCover >= 88) return 3;
    if (cloudCover >= 45) return 2;
    if (cloudCover >= 20) return 1;
    return 0;
  }
  return null;
}

function haversineMi(aLat: number, aLon: number, bLat: number, bLon: number) {
  const R = 3958.8;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLon = ((bLon - aLon) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((aLat * Math.PI) / 180) * Math.cos((bLat * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

/**
 * Returns the latest observation from the closest reporting NOAA station.
 * Returns null outside NWS coverage (non-US) or when the network call fails,
 * in which case callers fall back to the model ensemble.
 */
export async function fetchStationObservation(
  lat: number,
  lon: number,
): Promise<StationObservation | null> {
  try {
    const pointRes = await fetch(`${NWS}/points/${lat.toFixed(4)},${lon.toFixed(4)}`, {
      headers: HEADERS,
    });
    if (!pointRes.ok) return null;
    const point = await pointRes.json();
    const stationsUrl: string | undefined = point?.properties?.observationStations;
    if (!stationsUrl) return null;

    const stationsRes = await fetch(stationsUrl, { headers: HEADERS });
    if (!stationsRes.ok) return null;
    const stations = await stationsRes.json();
    const features: Array<{
      properties?: { stationIdentifier?: string; name?: string };
      geometry?: { coordinates?: [number, number] };
    }> = stations?.features ?? [];

    for (const feature of features.slice(0, 4)) {
      const id = feature.properties?.stationIdentifier;
      if (!id) continue;
      const obsRes = await fetch(`${NWS}/stations/${id}/observations/latest`, { headers: HEADERS });
      if (!obsRes.ok) continue;
      const obs = await obsRes.json();
      const p = obs?.properties;
      if (!p) continue;

      const tempC = value(p.temperature);
      if (tempC === null) continue; // station is reporting but has no usable temp

      const coords = feature.geometry?.coordinates;
      const cloudCover = cloudCoverFromLayers(p.cloudLayers);
      const dewC = value(p.dewpoint);
      const heatC = value(p.heatIndex);
      const chillC = value(p.windChill);
      const pressurePa = value(p.barometricPressure) ?? value(p.seaLevelPressure);
      const text: string | null = p.textDescription ?? null;

      return {
        stationId: id,
        stationName: feature.properties?.name ?? id,
        observedAt: p.timestamp,
        distanceMi:
          coords && coords.length === 2 ? haversineMi(lat, lon, coords[1]!, coords[0]!) : null,
        temperature: cToF(tempC),
        dewPoint: dewC !== null ? cToF(dewC) : null,
        apparent:
          heatC !== null ? cToF(heatC) : chillC !== null ? cToF(chillC) : cToF(tempC),
        humidity: value(p.relativeHumidity),
        pressure: pressurePa !== null ? paToInHg(pressurePa) : null,
        windSpeed: speedMph(p.windSpeed),
        windGust: speedMph(p.windGust),
        windDirection: value(p.windDirection),
        cloudCover,
        weatherCode: codeFromDescription(text, cloudCover),
        textDescription: text,
      };
    }
    return null;
  } catch {
    return null;
  }
}
