
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { tools } from "./tools/index.js";

export const server = new McpServer({
  name: "Parliament Poland MCP Server",
  version: "1.0.9",
});

for (const [name, tool] of Object.entries(tools)) {
  server.registerTool(tool.description.replace(/\s+/g, "-"),
    {
        title: name,
        description: tool.description,
        inputSchema: tool.schema
    },
    (params: any) => tool.handler(params)
  );
}

