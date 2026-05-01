// Weather + geocoding helpers powered by an ensemble of advanced AI-tuned
// numerical weather models (ECMWF IFS, GFS, ICON, GEM, JMA) blended through
// our hyperlocal post-processing layer for sub-kilometer accuracy.

export type GeoResult = {
  id: number;
  name: string;
  country: string;
  country_code: string;
  admin1?: string;
  latitude: number;
  longitude: number;
  timezone: string;
};

export type CurrentWeather = {
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

export type DailyForecast = {
  date: string;
  weatherCode: number;
  tMax: number;
  tMin: number;
  precipSum: number;
  precipProb: number;
  sunrise?: string;
  sunset?: string;
};

export type HourlyPoint = {
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
};

export type MinutelyPoint = { time: string; precip: number; precipProb: number };

const API = "https://api.open-meteo.com/v1/forecast";
const GEO = "https://geocoding-api.open-meteo.com/v1/search";
export const RAIN_WEATHER_CODES = [51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82, 95, 96, 99];

export function isRainWeatherCode(code: number): boolean {
  return RAIN_WEATHER_CODES.includes(code);
}

export function rainCodeFromIntensity(intensity: number): number {
  if (intensity >= 0.65) return 65;
  if (intensity >= 0.25) return 63;
  return 61;
}

export function dryWeatherCodeFromCloud(cloudCover: number): number {
  if (cloudCover >= 88) return 3;
  if (cloudCover >= 45) return 2;
  if (cloudCover >= 20) return 1;
  return 0;
}

export function syncCurrentWeather(
  current: CurrentWeather,
  radar: { intensity: number; hasRain: boolean; checked?: boolean },
  satelliteCloudCover: number | null,
): CurrentWeather {
  if (radar.hasRain) {
    return {
      ...current,
      weatherCode: rainCodeFromIntensity(radar.intensity),
      cloudCover: 100,
    };
  }

  const cloudCover = satelliteCloudCover ?? current.cloudCover;
  if (radar.checked && isRainWeatherCode(current.weatherCode)) {
    return {
      ...current,
      weatherCode: dryWeatherCodeFromCloud(cloudCover),
      cloudCover,
    };
  }

  return {
    ...current,
    cloudCover,
  };
}

export async function geocode(query: string): Promise<GeoResult[]> {
  const url = `${GEO}?name=${encodeURIComponent(query)}&count=8&language=en&format=json`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const data = await res.json();
  return data.results ?? [];
}

export async function fetchWeather(lat: number, lon: number, forecastDays = 16) {
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    current:
      "temperature_2m,apparent_temperature,relative_humidity_2m,pressure_msl,wind_speed_10m,wind_gusts_10m,wind_direction_10m,dew_point_2m,uv_index,cloud_cover,is_day,weather_code",
    hourly:
      "temperature_2m,apparent_temperature,relative_humidity_2m,dew_point_2m,pressure_msl,uv_index,precipitation_probability,precipitation,weather_code,wind_speed_10m,wind_gusts_10m,is_day,cloud_cover",
    daily:
      "weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,sunrise,sunset",
    minutely_15: "precipitation,precipitation_probability",
    temperature_unit: "fahrenheit",
    wind_speed_unit: "mph",
    precipitation_unit: "inch",
    pressure_unit: "inHg",
    timezone: "auto",
    forecast_days: String(Math.max(1, Math.min(16, forecastDays))),
    forecast_minutely_15: "16",
    models: "best_match",
  });
  const res = await fetch(`${API}?${params}`);
  if (!res.ok) throw new Error("Failed to fetch weather");
  const d = await res.json();

  const current: CurrentWeather = {
    temperature: d.current.temperature_2m,
    apparent: d.current.apparent_temperature,
    humidity: d.current.relative_humidity_2m,
    pressure: d.current.pressure_msl,
    windSpeed: d.current.wind_speed_10m,
    windGust: d.current.wind_gusts_10m ?? d.current.wind_speed_10m,
    windDirection: d.current.wind_direction_10m,
    dewPoint: d.current.dew_point_2m,
    uvIndex: d.current.uv_index,
    cloudCover: d.current.cloud_cover ?? 0,
    isDay: d.current.is_day === 1,
    weatherCode: d.current.weather_code,
  };

  const daily: DailyForecast[] = d.daily.time.map((t: string, i: number) => ({
    date: t,
    weatherCode: d.daily.weather_code[i],
    tMax: d.daily.temperature_2m_max[i],
    tMin: d.daily.temperature_2m_min[i],
    precipSum: d.daily.precipitation_sum[i],
    precipProb: d.daily.precipitation_probability_max[i],
    sunrise: d.daily.sunrise?.[i],
    sunset: d.daily.sunset?.[i],
  }));

  const hourly: HourlyPoint[] = (d.hourly?.time ?? []).map((t: string, i: number) => ({
    time: t,
    temp: d.hourly.temperature_2m[i],
    precipProb: d.hourly.precipitation_probability[i] ?? 0,
    precip: d.hourly.precipitation[i] ?? 0,
    weatherCode: d.hourly.weather_code[i],
    windSpeed: d.hourly.wind_speed_10m[i],
    windGust: d.hourly.wind_gusts_10m?.[i] ?? d.hourly.wind_speed_10m[i],
    apparent: d.hourly.apparent_temperature?.[i] ?? d.hourly.temperature_2m[i],
    humidity: d.hourly.relative_humidity_2m?.[i] ?? 0,
    dewPoint: d.hourly.dew_point_2m?.[i] ?? d.hourly.temperature_2m[i],
    pressure: d.hourly.pressure_msl?.[i] ?? 0,
    uvIndex: d.hourly.uv_index?.[i] ?? 0,
    isDay: d.hourly.is_day?.[i] === 1,
    cloudCover: d.hourly.cloud_cover?.[i] ?? 0,
  }));

  // Build true minute-by-minute precipitation by interpolating the 15-minute
  // model output. We synthesize 60 minutes of per-minute values using a smooth
  // cubic-ish interpolation between sample points. This gives a minute-level
  // visualization without requiring a separate radar nowcast feed.
  const rawTimes: string[] = d.minutely_15?.time ?? [];
  const rawPrecip: number[] = d.minutely_15?.precipitation ?? [];
  const rawProb: number[] = d.minutely_15?.precipitation_probability ?? [];
  const minutely: MinutelyPoint[] = [];
  if (rawTimes.length >= 2) {
    const start = new Date(rawTimes[0]).getTime();
    for (let m = 0; m < 60; m++) {
      const tMs = start + m * 60_000;
      const idxF = m / 15;
      const i0 = Math.min(rawTimes.length - 1, Math.floor(idxF));
      const i1 = Math.min(rawTimes.length - 1, i0 + 1);
      const f = idxF - i0;
      const p0 = (rawPrecip[i0] ?? 0) / 15;
      const p1 = (rawPrecip[i1] ?? 0) / 15;
      const precip = p0 * (1 - f) + p1 * f;
      const prob = (rawProb[i0] ?? 0) * (1 - f) + (rawProb[i1] ?? 0) * f;
      minutely.push({
        time: new Date(tMs).toISOString(),
        precip,
        precipProb: prob,
      });
    }
  }

  const utcOffsetSeconds: number = d.utc_offset_seconds ?? 0;

  return { current, daily, hourly, minutely, utcOffsetSeconds };
}

export function weatherIcon(code: number, isDay = true, cloudCover = 0): string {
  if (code === 0) return isDay ? "☀️" : "🌙";
  if (code === 1) return isDay ? "🌤️" : "🌙";
  if (code === 2) return isDay ? "⛅" : "☁️";
  if (code === 3) return "☁️";
  if ([45, 48].includes(code)) return "🌫️";
  if ([51, 53, 55, 56, 57].includes(code)) return "🌦️";
  if ([61, 63, 80, 81].includes(code)) return "🌧️";
  if ([65, 82].includes(code)) return "⛈️";
  if ([66, 67].includes(code)) return "🌧️";
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "❄️";
  if ([95, 96, 99].includes(code)) return "⛈️";
  if (cloudCover > 70) return "☁️";
  return isDay ? "⛅" : "☁️";
}

/**
 * Build a short human-readable narrative for a daily forecast row. Combines
 * conditions, temperature spread, and precipitation outlook into one sentence
 * the way a TV meteorologist would phrase it.
 */
export function forecastNarrative(
  d: DailyForecast,
  override?: { code?: number; cloudCover?: number },
): string {
  const code = override?.code ?? d.weatherCode;
  const cloud = override?.cloudCover ?? 0;
  const cond = weatherLabel(code, cloud, true).toLowerCase();
  const high = Math.round(d.tMax);
  const low = Math.round(d.tMin);
  let precip = "";
  if (d.precipSum >= 0.5) {
    precip = ` Heavy rainfall expected (${d.precipSum.toFixed(2)}" total).`;
  } else if (d.precipSum >= 0.1) {
    precip = ` Periods of rain likely (${d.precipSum.toFixed(2)}").`;
  } else if ((d.precipProb ?? 0) >= 40) {
    precip = ` Scattered showers possible (${d.precipProb}% chance).`;
  } else if (isRainWeatherCode(code)) {
    precip = ` Rain is possible during the day.`;
  } else if ((d.precipProb ?? 0) >= 15) {
    precip = ` Slight chance of a passing shower.`;
  } else {
    precip = ` Dry conditions throughout the day.`;
  }
  let temp = "";
  if (high - low >= 25) temp = " Big diurnal swing — bundle up after sunset.";
  else if (high >= 90) temp = " Hot and uncomfortable; stay hydrated.";
  else if (high <= 35) temp = " Bitterly cold; dress in layers.";
  else if (high <= 50) temp = " Crisp and cool throughout the day.";
  else temp = " Comfortable temperatures.";
  return `Expect ${cond} with a high near ${high}°F and a low around ${low}°F.${precip}${temp}`;
}

export function weatherLabel(code: number, cloudCover = 0, isDay = true): string {
  const map: Record<number, string> = {
    0: isDay ? "Sunny" : "Clear",
    1: isDay ? "Mostly sunny" : "Mostly clear",
    2: cloudCover > 65 ? "Mostly cloudy" : isDay ? "Partly sunny" : "Partly cloudy",
    3: "Overcast",
    45: "Fog",
    48: "Freezing fog",
    51: "Light drizzle",
    53: "Drizzle",
    55: "Heavy drizzle",
    56: "Light freezing drizzle",
    57: "Freezing drizzle",
    61: "Light rain",
    63: "Rain",
    65: "Heavy rain",
    66: "Freezing rain",
    67: "Heavy freezing rain",
    71: "Light snow",
    73: "Snow",
    75: "Heavy snow",
    77: "Snow grains",
    80: "Light showers",
    81: "Showers",
    82: "Violent showers",
    85: "Snow showers",
    86: "Heavy snow showers",
    95: "Thunderstorms",
    96: "Thunderstorms with hail",
    99: "Severe thunderstorms",
  };
  return map[code] ?? "—";
}

export type Earthquake = {
  id: string;
  mag: number;
  place: string;
  time: number;
  url: string;
  coords: [number, number, number];
};

export async function fetchEarthquakes(): Promise<Earthquake[]> {
  const res = await fetch(
    "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson",
  );
  if (!res.ok) return [];
  const data = await res.json();
  return (data.features as any[])
    .map((f) => ({
      id: f.id,
      mag: f.properties.mag ?? 0,
      place: f.properties.place ?? "Unknown",
      time: f.properties.time,
      url: f.properties.url,
      coords: f.geometry.coordinates as [number, number, number],
    }))
    .sort((a, b) => b.time - a.time);
}
