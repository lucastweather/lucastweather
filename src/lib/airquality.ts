// Air quality + pollen from a server-side blend of chemistry-transport models
// (CAMS global + CAMS Europe regional ensemble), with the US AQI recomputed
// locally from the blended concentrations.

export type AirQuality = {
  usAqi: number | null;
  pm25: number | null;
  pm10: number | null;
  ozone: number | null;
  no2: number | null;
  so2: number | null;
  co: number | null;
  grassPollen: number | null;
  treePollen: number | null;
  weedPollen: number | null;
};

export async function fetchAirQuality(lat: number, lon: number): Promise<AirQuality | null> {
  try {
    const { getBlendedAirQuality } = await import("./airquality.functions");
    return await getBlendedAirQuality({ data: { lat, lon } });
  } catch {
    return null;
  }
}


export function aqiCategory(aqi: number | null): {
  label: string;
  color: string;
  advice: string;
} {
  if (aqi == null) return { label: "—", color: "var(--muted-foreground)", advice: "Data unavailable." };
  if (aqi <= 50) return { label: "Good", color: "var(--success)", advice: "Air quality is satisfactory." };
  if (aqi <= 100)
    return {
      label: "Moderate",
      color: "var(--warning)",
      advice: "Acceptable; sensitive groups consider limiting prolonged outdoor exertion.",
    };
  if (aqi <= 150)
    return {
      label: "Unhealthy for Sensitive",
      color: "oklch(0.72 0.18 50)",
      advice: "Sensitive groups should reduce prolonged outdoor activity.",
    };
  if (aqi <= 200)
    return { label: "Unhealthy", color: "var(--danger)", advice: "Everyone may experience effects." };
  if (aqi <= 300)
    return { label: "Very Unhealthy", color: "oklch(0.55 0.25 320)", advice: "Health alert; avoid outdoor exertion." };
  return { label: "Hazardous", color: "oklch(0.45 0.22 20)", advice: "Emergency conditions; stay indoors." };
}
