import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { fetchWeather, weatherLabel } from "@/lib/weather";

export default defineTool({
  name: "get_hourly_forecast",
  title: "Get hourly forecast",
  description:
    "Hour-by-hour forecast (temperature, precipitation chance, wind, gusts, cloud cover) for a latitude/longitude.",
  inputSchema: {
    latitude: z.number().describe("Latitude in decimal degrees."),
    longitude: z.number().describe("Longitude in decimal degrees."),
    hours: z.number().int().describe("Number of hours to return, 1-168.").optional(),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: true },
  handler: async ({ latitude, longitude, hours }) => {
    const limit = Math.max(1, Math.min(168, Math.round(hours ?? 24)));
    const days = Math.max(1, Math.min(16, Math.ceil(limit / 24) + 1));
    const { hourly } = await fetchWeather(latitude, longitude, days);
    const now = Date.now();
    const upcoming = hourly
      .filter((h) => new Date(h.time).getTime() >= now - 60 * 60 * 1000)
      .slice(0, limit)
      .map((h) => ({
        time: h.time,
        temp: h.temp,
        apparent: h.apparent,
        precipProb: h.precipProb,
        precip: h.precip,
        windSpeed: h.windSpeed,
        windGust: h.windGust,
        cloudCover: h.cloudCover,
        condition: weatherLabel(h.weatherCode, h.cloudCover, h.isDay),
      }));
    return {
      content: [{ type: "text", text: JSON.stringify(upcoming, null, 2) }],
      structuredContent: { hours: upcoming },
    };
  },
});
