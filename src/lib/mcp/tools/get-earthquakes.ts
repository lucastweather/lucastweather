import { defineTool } from "@lovable.dev/mcp-js";
import { fetchEarthquakes } from "@/lib/weather";

export default defineTool({
  name: "get_earthquakes",
  title: "Get recent earthquakes",
  description: "Recent significant earthquakes from the USGS seismic feed.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: true },
  handler: async () => {
    const quakes = await fetchEarthquakes();
    return {
      content: [{ type: "text", text: JSON.stringify(quakes, null, 2) }],
      structuredContent: { earthquakes: quakes },
    };
  },
});
