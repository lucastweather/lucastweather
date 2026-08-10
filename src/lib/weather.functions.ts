import { createServerFn } from "@tanstack/react-start";

export const getEnsembleWeather = createServerFn({ method: "GET" })
  .inputValidator((input: { lat: number; lon: number; days?: number; timezone?: string }) => input)
  .handler(async ({ data }) => {
    const { buildEnsembleForecast } = await import("./models/ensemble.server");
    return buildEnsembleForecast(data.lat, data.lon, data.days ?? 16, data.timezone);
  });
