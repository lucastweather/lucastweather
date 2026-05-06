// Air quality + pollen via Open-Meteo's free Air Quality API.

export type AirQuality = {
  usAqi: number | null;
  pm25: number | null;
  pm10: number | null;
  ozone: number | null;
  no2: number | null;
  so2: number | null;
  co: number | null;
  // Pollen (Europe-only from Open-Meteo CAMS, may be null elsewhere)
  grassPollen: number | null;
  treePollen: number | null;
  weedPollen: number | null;
};

const URL = "https://air-quality-api.open-meteo.com/v1/air-quality";

export async function fetchAirQuality(lat: number, lon: number): Promise<AirQuality | null> {
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    current:
      "us_aqi,pm2_5,pm10,ozone,nitrogen_dioxide,sulphur_dioxide,carbon_monoxide,grass_pollen,tree_pollen,weed_pollen",
    timezone: "auto",
  });
  try {
    const res = await fetch(`${URL}?${params}`);
    if (!res.ok) return null;
    const d = await res.json();
    const c = d.current ?? {};
    return {
      usAqi: c.us_aqi ?? null,
      pm25: c.pm2_5 ?? null,
      pm10: c.pm10 ?? null,
      ozone: c.ozone ?? null,
      no2: c.nitrogen_dioxide ?? null,
      so2: c.sulphur_dioxide ?? null,
      co: c.carbon_monoxide ?? null,
      grassPollen: c.grass_pollen ?? null,
      treePollen: c.tree_pollen ?? null,
      weedPollen: c.weed_pollen ?? null,
    };
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
