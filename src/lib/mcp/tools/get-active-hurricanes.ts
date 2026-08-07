import { defineTool } from "@lovable.dev/mcp-js";
import { fetchActiveStorms } from "@/lib/nhc";

export default defineTool({
  name: "get_active_hurricanes",
  title: "Get active tropical storms",
  description:
    "Active tropical cyclones from the National Hurricane Center, including intensity, pressure, movement, and advisory links.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: true },
  handler: async () => {
    const storms = await fetchActiveStorms();
    return {
      content: [{ type: "text", text: JSON.stringify(storms, null, 2) }],
      structuredContent: { storms },
    };
  },
});
