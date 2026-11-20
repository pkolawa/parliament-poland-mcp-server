import { jest } from "@jest/globals";
import { tools } from "../src/tools/index.js";
const registerTool = jest.fn();

jest.mock("@modelcontextprotocol/sdk/server/mcp.js", () => ({
  McpServer: jest.fn().mockImplementation(() => ({
    registerTool,
  })),
}));

describe("server tool registration", () => {
  it("registers every tool under its registry key with read-only annotations", async () => {
    await import("../src/server.js");

    expect(registerTool).toHaveBeenCalledTimes(Object.keys(tools).length);

    for (const [name, tool] of Object.entries(tools)) {
      expect(registerTool).toHaveBeenCalledWith(
        name,
        expect.objectContaining({
          title: tool.title,
          description: tool.description,
          inputSchema: tool.schema,
          outputSchema: tool.outputSchema,
          annotations: { title: tool.title, readOnlyHint: true, openWorldHint: true },
        }),
        expect.any(Function)
      );
    }
  });

  it("uses kebab-case tool names", () => {
    for (const name of Object.keys(tools)) {
      expect(name).toMatch(/^[a-z]+(-[a-z]+)*$/);
    }
  });
});
