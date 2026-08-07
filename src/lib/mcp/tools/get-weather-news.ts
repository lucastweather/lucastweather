import { defineTool } from "@lovable.dev/mcp-js";
import { fetchNewsStories } from "@/lib/news-stories";

export default defineTool({
  name: "get_weather_news",
  title: "Get weather news",
  description: "Latest Lucast Weather news stories with headlines, summaries, and links.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: true },
  handler: async () => {
    const stories = await fetchNewsStories();
    return {
      content: [{ type: "text", text: JSON.stringify(stories, null, 2) }],
      structuredContent: { stories },
    };
  },
});
