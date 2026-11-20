import { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import { tools } from "./tools/index.js";

export const server = new McpServer({
  name: "Parliament Poland MCP Server",
  version: "2.0.0",
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
      // SDK v2 deprecates raw shapes and would wrap them with its own copy of Zod.
      inputSchema: z.object(tool.schema),
      outputSchema: tool.outputSchema,
      annotations: { title: tool.title, ...TOOL_ANNOTATIONS },
    },
    (params: Record<string, unknown>) => tool.handler(params as never)
  );
}
