import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { fetchWeather, weatherLabel } from "@/lib/weather";

export default defineTool({
  name: "get_daily_forecast",
  title: "Get daily forecast",
  description:
    "Daily forecast (high/low, precipitation total and chance, sunrise/sunset) for up to 16 days at a latitude/longitude.",
  inputSchema: {
    latitude: z.number().describe("Latitude in decimal degrees."),
    longitude: z.number().describe("Longitude in decimal degrees."),
    days: z.number().int().describe("Number of forecast days, 1-16.").optional(),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: true },
  handler: async ({ latitude, longitude, days }) => {
    const requested = Math.max(1, Math.min(16, Math.round(days ?? 7)));
    const { daily } = await fetchWeather(latitude, longitude, requested);
    const rows = daily.slice(0, requested).map((d) => ({
      ...d,
      condition: weatherLabel(d.weatherCode, 0, true),
    }));
    return {
      content: [{ type: "text", text: JSON.stringify(rows, null, 2) }],
      structuredContent: { days: rows },
    };
  },
});
