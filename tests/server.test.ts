import { jest } from "@jest/globals";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
const { tools } = await import("../src/tools/index.js");

describe("server tool registration", () => {
  it("registers every tool with the MCP server", async () => {
    const registerToolSpy = jest.spyOn(McpServer.prototype, "registerTool");
    await import("../src/server.js");

    expect(registerToolSpy).toHaveBeenCalledTimes(Object.keys(tools).length);

    for (const [name, tool] of Object.entries(tools)) {
      const slug = tool.description.replace(/\s+/g, "-");
      expect(registerToolSpy).toHaveBeenCalledWith(
        slug,
        expect.objectContaining({
          title: name,
          description: tool.description,
          inputSchema: tool.schema,
        }),
        expect.any(Function)
      );
    }

    registerToolSpy.mockRestore();
  });
});
