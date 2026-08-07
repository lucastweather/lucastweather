import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { geocode } from "@/lib/weather";

export default defineTool({
  name: "search_city",
  title: "Search city",
  description:
    "Find cities by name and return their coordinates, country, and admin region. Use the latitude/longitude with the weather tools.",
  inputSchema: { query: z.string().min(1).describe("City name to search for, e.g. 'Seattle'.") },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: true },
  handler: async ({ query }) => {
    const results = await geocode(query);
    const items = results.map((r) => ({
      name: r.name,
      country: r.country,
      admin1: r.admin1,
      latitude: r.latitude,
      longitude: r.longitude,
    }));
    return {
      content: [{ type: "text", text: JSON.stringify(items, null, 2) }],
      structuredContent: { results: items },
    };
  },
});
