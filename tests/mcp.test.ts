import { jest } from "@jest/globals";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { makeSejmRequest } from "../src/utils/api.js";
import { server } from "../src/server.js";
import { tools } from "../src/tools/index.js";

type MakeSejmRequestFn = (endpoint: string, params?: Record<string, unknown>) => Promise<unknown>;

jest.mock("../src/utils/api.js", () => ({
  makeSejmRequest: jest.fn(),
}));

const makeSejmRequestMock = makeSejmRequest as jest.MockedFunction<MakeSejmRequestFn>;
const client = new Client({ name: "test-client", version: "1.0.0" });

beforeAll(async () => {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
});

afterAll(async () => {
  await client.close();
});

beforeEach(() => {
  makeSejmRequestMock.mockReset();
});

describe("MCP protocol", () => {
  it("lists every tool under its registry key with a title, annotations and descriptions", async () => {
    const { tools: listed } = await client.listTools();

    expect(listed.map((t) => t.name).sort()).toEqual(Object.keys(tools).sort());
    for (const tool of listed) {
      expect(tool.title).toBeTruthy();
      expect(tool.annotations).toMatchObject({ readOnlyHint: true, openWorldHint: true });
      for (const [param, schema] of Object.entries(tool.inputSchema.properties ?? {})) {
        expect([tool.name, param, (schema as { description?: string }).description]).toEqual([
          tool.name,
          param,
          expect.any(String),
        ]);
      }
    }
  });

  it("makes term optional in every tool", async () => {
    const { tools: listed } = await client.listTools();

    for (const tool of listed.filter((t) => t.inputSchema.properties?.term)) {
      expect([tool.name, tool.inputSchema.required ?? []]).toEqual([tool.name, expect.not.arrayContaining(["term"])]);
    }
  });

  it("publishes self-contained output schemas for JSON tools", async () => {
    const { tools: listed } = await client.listTools();
    const textTools = ["get-interpellation-text", "get-statement"];

    for (const tool of listed) {
      if (textTools.includes(tool.name)) {
        expect(tool.outputSchema).toBeUndefined();
      } else {
        expect([tool.name, tool.outputSchema?.type]).toEqual([tool.name, "object"]);
        // Some clients do not resolve $ref in tool schemas.
        expect([tool.name, JSON.stringify(tool.outputSchema)]).toEqual([tool.name, expect.not.stringContaining("$ref")]);
      }
      expect([tool.name, JSON.stringify(tool.inputSchema)]).toEqual([tool.name, expect.not.stringContaining("$ref")]);
    }
  });

  it("returns structured content that passes the output schema of a list tool", async () => {
    makeSejmRequestMock.mockResolvedValue({
      ok: true,
      data: [{ id: "KO", name: "Klub Parlamentarny Koalicja Obywatelska", extra: { any: "field" } }],
      notice: "Note: cached.\n\n",
    });

    const result = await client.callTool({ name: "get-clubs", arguments: { term: 10 } });

    expect(result.isError).toBeFalsy();
    expect(result.structuredContent).toEqual({
      total: 1,
      offset: 0,
      items: [{ id: "KO", name: "Klub Parlamentarny Koalicja Obywatelska", extra: { any: "field" } }],
      notice: "Note: cached.",
    });
  });

  it("returns a filtered page that passes the output schema of get-members", async () => {
    makeSejmRequestMock.mockResolvedValue({
      ok: true,
      data: [
        { id: 1, firstLastName: "Jan Kowalski", club: "KO", active: true, profession: "prawnik" },
        { id: 2, firstLastName: "Anna Nowak", club: "KO", active: true },
        { id: 3, firstLastName: "Piotr Wiśniewski", club: "PiS", active: true },
      ],
    });

    const result = await client.callTool({
      name: "get-members",
      arguments: { term: 10, club: "KO", limit: 1, fields: ["profession"] },
    });

    expect(result.isError).toBeFalsy();
    expect(result.structuredContent).toEqual({
      total: 2,
      offset: 0,
      nextOffset: 1,
      items: [{ id: 1, firstLastName: "Jan Kowalski", club: "KO", active: true, profession: "prawnik" }],
    });
  });

  it("rejects an unknown extra field of get-members", async () => {
    const result = await client.callTool({ name: "get-members", arguments: { term: 10, fields: ["password"] } });

    expect(result.isError).toBe(true);
    expect(makeSejmRequestMock).not.toHaveBeenCalled();
  });

  it("returns structured content that passes the output schema of a transformed object", async () => {
    makeSejmRequestMock.mockResolvedValue({
      ok: true,
      data: {
        votingNumber: 5,
        title: "Ustawa",
        yes: 1,
        no: 1,
        votes: [
          { MP: 1, club: "KO", vote: "YES" },
          { MP: 2, club: "PiS", vote: "NO" },
        ],
      },
    });

    const result = await client.callTool({
      name: "get-voting",
      arguments: { term: 10, sitting: 1, votingNumber: 5, club: "KO" },
    });

    expect(result.isError).toBeFalsy();
    expect(result.structuredContent).toEqual({
      votingNumber: 5,
      title: "Ustawa",
      yes: 1,
      no: 1,
      votesByClub: { KO: { YES: 1 }, PiS: { NO: 1 } },
      votes: [{ MP: 1, club: "KO", vote: "YES" }],
    });
  });

  it("returns plain text without structured content for text tools", async () => {
    makeSejmRequestMock.mockResolvedValue({ ok: true, data: "<p>Panie Marszałku!</p>" });

    const result = await client.callTool({
      name: "get-statement",
      arguments: { term: 10, proceeding: 1, date: "2023-11-13", statementNum: 1 },
    });

    expect(result.structuredContent).toBeUndefined();
    expect(result.content).toEqual([
      { type: "text", text: "Fetched statement 1 from sitting 1 on 2023-11-13 in term 10:\n\nPanie Marszałku!" },
    ]);
  });

  it("returns errors as tool results with isError", async () => {
    makeSejmRequestMock.mockResolvedValue({
      ok: false,
      error: { status: 404, message: "HTTP 404 Not Found for /sejm/term10/MP/9999" },
    });

    const result = await client.callTool({ name: "get-member", arguments: { id: 9999 } });

    // The current term could not be determined either, since every request fails.
    expect(result.isError).toBe(true);
    expect(result.structuredContent).toBeUndefined();
  });

  it("rejects arguments outside the schema", async () => {
    const result = await client.callTool({ name: "get-print", arguments: { printNumber: "../MP" } });

    expect(result.isError).toBe(true);
    expect(makeSejmRequestMock).not.toHaveBeenCalled();
  });
});
