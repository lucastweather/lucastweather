/**
 * MET Norway Locationforecast 2.0 (ECMWF-driven global model) ingest.
 *
 * This is one of the numerical members feeding the Lucast AI ensemble.
 * Open-Meteo is NOT used for any forecast data.
 */

export type ModelHour = {
  timeMs: number;
  temp: number; // F
  dewPoint: number; // F
  humidity: number; // %
  pressure: number; // inHg
  windSpeed: number; // mph
  windGust: number; // mph
  windDirection: number; // deg
  cloudCover: number; // %
  uvIndex: number;
  precip: number; // inch
  precipProb: number; // %
  weatherCode: number;
};

const URL_BASE = "https://api.met.no/weatherapi/locationforecast/2.0/complete";
const UA = "LucastWeather/1.0 (https://lucastweather.lovable.app)";

const cToF = (c: number) => c * 1.8 + 32;
const msToMph = (m: number) => m * 2.236936;
const mmToIn = (m: number) => m / 25.4;
const hpaToInHg = (h: number) => h / 33.8639;

export function symbolToWmo(symbol: string | undefined): number {
  if (!symbol) return 3;
  const s = symbol.split("_")[0];
  if (s.includes("thunder")) return 95;
  if (s.includes("snow")) return s.includes("heavy") ? 75 : s.includes("light") ? 71 : 73;
  if (s.includes("sleet")) return s.includes("heavy") ? 67 : 66;
  if (s.includes("showers")) return s.includes("heavy") ? 82 : s.includes("light") ? 80 : 81;
  if (s.includes("rain")) return s.includes("heavy") ? 65 : s.includes("light") ? 61 : 63;
  if (s.includes("fog")) return 45;
  if (s === "clearsky") return 0;
  if (s === "fair") return 1;
  if (s === "partlycloudy") return 2;
  return 3;
}

type Details = Record<string, number | undefined>;

export async function fetchMetNoHourly(lat: number, lon: number): Promise<ModelHour[]> {
  const res = await fetch(
    `${URL_BASE}?lat=${lat.toFixed(4)}&lon=${lon.toFixed(4)}`,
    { headers: { "User-Agent": UA, Accept: "application/json" } },
  );
  if (!res.ok) throw new Error(`met.no ${res.status}`);
  const json = (await res.json()) as {
    properties?: {
      timeseries?: Array<{
        time: string;
        data?: {
          instant?: { details?: Details };
          next_1_hours?: { summary?: { symbol_code?: string }; details?: Details };
          next_6_hours?: { summary?: { symbol_code?: string }; details?: Details };
        };
      }>;
    };
  };

  const series = json.properties?.timeseries ?? [];
  return series.map((entry) => {
    const inst = entry.data?.instant?.details ?? {};
    const next1 = entry.data?.next_1_hours;
    const next6 = entry.data?.next_6_hours;
    const precipMm =
      next1?.details?.["precipitation_amount"] ??
      (next6?.details?.["precipitation_amount"] ?? 0) / 6;
    const prob =
      next1?.details?.["probability_of_precipitation"] ??
      next6?.details?.["probability_of_precipitation"] ??
      0;
    const tempC = inst["air_temperature"] ?? 0;
    const dewC = inst["dew_point_temperature"] ?? tempC - 5;
    return {
      timeMs: Date.parse(entry.time),
      temp: cToF(tempC),
      dewPoint: cToF(dewC),
      humidity: inst["relative_humidity"] ?? 0,
      pressure: hpaToInHg(inst["air_pressure_at_sea_level"] ?? 1013),
      windSpeed: msToMph(inst["wind_speed"] ?? 0),
      windGust: msToMph(inst["wind_speed_of_gust"] ?? (inst["wind_speed"] ?? 0) * 1.4),
      windDirection: inst["wind_from_direction"] ?? 0,
      cloudCover: inst["cloud_area_fraction"] ?? 0,
      uvIndex: inst["ultraviolet_index_clear_sky"] ?? 0,
      precip: mmToIn(precipMm ?? 0),
      precipProb: prob ?? 0,
      weatherCode: symbolToWmo(next1?.summary?.symbol_code ?? next6?.summary?.symbol_code),
    };
  });
}
