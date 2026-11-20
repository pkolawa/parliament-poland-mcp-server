import { jest } from "@jest/globals";
import { z } from "zod";
import { tools } from "../src/tools/index.js";
const registerTool = jest.fn();

jest.mock("@modelcontextprotocol/server", () => ({
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
          inputSchema: expect.any(z.ZodObject),
          outputSchema: tool.outputSchema,
          annotations: { title: tool.title, readOnlyHint: true, openWorldHint: true },
        }),
        expect.any(Function)
      );

      // SDK v2 deprecates raw shapes, so each shape is wrapped in z.object.
      const call = registerTool.mock.calls.find(([registered]) => registered === name);
      const { inputSchema } = call?.[1] as { inputSchema: z.ZodObject };
      expect([name, inputSchema.shape]).toEqual([name, tool.schema]);
    }
  });

  it("uses kebab-case tool names", () => {
    for (const name of Object.keys(tools)) {
      expect(name).toMatch(/^[a-z]+(-[a-z]+)*$/);
    }
  });
});
