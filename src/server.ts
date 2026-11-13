import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { tools } from "./tools/index.js";

export const server = new McpServer({
  name: "Parliament Poland MCP Server",
  version: "1.4.0",
});

/** Every tool only reads public data from the Sejm API. */
export const TOOL_ANNOTATIONS = {
  readOnlyHint: true,
  openWorldHint: true,
} as const;

for (const [name, tool] of Object.entries(tools)) {
  server.registerTool(
    name,
    {
      title: tool.title,
      description: tool.description,
      inputSchema: tool.schema,
      outputSchema: tool.outputSchema,
      annotations: { title: tool.title, ...TOOL_ANNOTATIONS },
    },
    (params: Record<string, unknown>) => tool.handler(params as never)
  );
}
