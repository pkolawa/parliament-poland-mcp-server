import { jest } from "@jest/globals";
import { tools } from "../src/tools/index.js";
const registerTool = jest.fn();

jest.mock("@modelcontextprotocol/sdk/server/mcp.js", () => ({
  McpServer: jest.fn().mockImplementation(() => ({
    registerTool,
  })),
}));

describe("server tool registration", () => {
  it("registers every tool with the MCP server", async () => {
    await import("../src/server.js");

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
