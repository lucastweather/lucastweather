import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { fetchWeather, weatherLabel } from "@/lib/weather";

export default defineTool({
  name: "get_current_weather",
  title: "Get current weather",
  description:
    "Current conditions (temperature, feels-like, humidity, wind, UV, cloud cover) for a latitude/longitude.",
  inputSchema: {
    latitude: z.number().describe("Latitude in decimal degrees."),
    longitude: z.number().describe("Longitude in decimal degrees."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: true },
  handler: async ({ latitude, longitude }) => {
    const { current } = await fetchWeather(latitude, longitude, 1);
    const summary = {
      ...current,
      condition: weatherLabel(current.weatherCode, current.cloudCover, current.isDay),
      units: { temperature: "F", wind: "mph", pressure: "inHg" },
    };
    return {
      content: [{ type: "text", text: JSON.stringify(summary, null, 2) }],
      structuredContent: summary,
    };
  },
});
