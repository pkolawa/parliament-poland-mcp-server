import { jest } from "@jest/globals";

const registerTool = jest.fn();

await jest.unstable_mockModule("@modelcontextprotocol/sdk/server/mcp.js", () => ({
  McpServer: class {
    registerTool = registerTool;
    constructor() {}
  },
}));

const { tools } = await import("../src/tools/index.js");
await import("../src/server.js");

describe("server tool registration", () => {
  it("registers every tool with the MCP server", () => {
    expect(registerTool).toHaveBeenCalledTimes(Object.keys(tools).length);

    for (const [name, tool] of Object.entries(tools)) {
      const slug = tool.description.replace(/\s+/g, "-");
      expect(registerTool).toHaveBeenCalledWith(
        slug,
        expect.objectContaining({
          title: name,
          description: tool.description,
          inputSchema: tool.schema,
        }),
        expect.any(Function)
      );
    }
  });
});
