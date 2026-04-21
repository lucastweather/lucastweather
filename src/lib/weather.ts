// Open-Meteo weather + geocoding helpers (no API key required)

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
  windDirection: number;
  dewPoint: number;
  uvIndex: number;
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
};

export type MinutelyPoint = { time: string; precip: number };

export async function geocode(query: string): Promise<GeoResult[]> {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=8&language=en&format=json`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const data = await res.json();
  return data.results ?? [];
}

export async function fetchWeather(lat: number, lon: number) {
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    current:
      "temperature_2m,apparent_temperature,relative_humidity_2m,pressure_msl,wind_speed_10m,wind_direction_10m,dew_point_2m,uv_index,is_day,weather_code",
    daily:
      "weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max",
    minutely_15: "precipitation",
    temperature_unit: "fahrenheit",
    wind_speed_unit: "mph",
    precipitation_unit: "inch",
    pressure_unit: "inHg",
    timezone: "auto",
    forecast_days: "7",
    forecast_minutely_15: "8",
  });
  const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
  if (!res.ok) throw new Error("Failed to fetch weather");
  const d = await res.json();

  const current: CurrentWeather = {
    temperature: d.current.temperature_2m,
    apparent: d.current.apparent_temperature,
    humidity: d.current.relative_humidity_2m,
    pressure: d.current.pressure_msl,
    windSpeed: d.current.wind_speed_10m,
    windDirection: d.current.wind_direction_10m,
    dewPoint: d.current.dew_point_2m,
    uvIndex: d.current.uv_index,
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
  }));

  const minutely: MinutelyPoint[] = (d.minutely_15?.time ?? []).map((t: string, i: number) => ({
    time: t,
    precip: d.minutely_15.precipitation[i] ?? 0,
  }));

  return { current, daily, minutely };
}

export function weatherIcon(code: number, isDay = true): string {
  if (code === 0) return isDay ? "☀️" : "🌙";
  if ([1, 2].includes(code)) return isDay ? "🌤️" : "🌙";
  if (code === 3) return "☁️";
  if ([45, 48].includes(code)) return "🌫️";
  if ([51, 53, 55, 56, 57].includes(code)) return "🌦️";
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return "🌧️";
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "🌨️";
  if ([95, 96, 99].includes(code)) return "⛈️";
  return "☁️";
}

export function weatherLabel(code: number): string {
  const map: Record<number, string> = {
    0: "Clear sky",
    1: "Mainly clear",
    2: "Partly cloudy",
    3: "Overcast",
    45: "Fog",
    48: "Rime fog",
    51: "Light drizzle",
    53: "Moderate drizzle",
    55: "Dense drizzle",
    56: "Light freezing drizzle",
    57: "Dense freezing drizzle",
    61: "Light rain",
    63: "Moderate rain",
    65: "Heavy rain",
    66: "Light freezing rain",
    67: "Heavy freezing rain",
    71: "Light snow",
    73: "Moderate snow",
    75: "Heavy snow",
    77: "Snow grains",
    80: "Light showers",
    81: "Moderate showers",
    82: "Violent showers",
    85: "Light snow showers",
    86: "Heavy snow showers",
    95: "Thunderstorm",
    96: "Thunderstorm w/ hail",
    99: "Severe thunderstorm",
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
