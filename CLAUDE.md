# CLAUDE.md

## Project

Parliament Poland MCP Server — TypeScript MCP server exposing the Polish Parliament public API (api.sejm.gov.pl) as tools for LLMs.

## Stack

- TypeScript (ESM, strict mode)
- @modelcontextprotocol/sdk (MCP server framework)
- Zod 4 (input schemas, and output schemas of API responses)
- esbuild (bundler → build/index.mjs)
- Jest + ts-jest (testing)
- Node 22+ (`engines`); `.nvmrc` pins 24 for development, CI tests 22, 24 and 26

## Commands

- `npm test` — run unit tests
- `npm run test:live-api` — run integration tests against live Sejm API (requires internet)
- `npm run test:smoke` — start the built server over stdio and check `initialize` and `tools/list`
- `npm run build` — run tests then bundle with esbuild
- `npm start` — run the built server

## Architecture

- `src/index.ts` — entry point, stdio transport
- `src/server.ts` — registers all tools with McpServer
- `src/utils/api.ts` — HTTP client (`makeSejmRequest`): retries, in-memory cache, `format: "html"` for HTML endpoints
- `src/utils/html.ts` — `htmlToText` for statement, interpellation and agenda HTML
- `src/utils/tool.ts` — `defineTool`, `buildToolResponse` (API result → MCP response), `withTerm` (default to the current term), output schema helpers
- `src/types/api.ts` — lenient Zod schemas of API responses (types via `z.infer`, also used as `outputSchema`)
- `src/tools/params.ts` — shared input parameters (`term`, `offset`, `limit`, dates, IDs) with LLM-oriented descriptions
- `src/tools/*.ts` — each file exports tools built with `defineTool({ title, description, schema, outputSchema, handler })`
- `src/tools/index.ts` — aggregates all tools into a single map; the keys are the MCP tool names

Tool pattern: `handler: ({ term, ... }) => withTerm(term, async (term) => buildToolResponse(await makeSejmRequest<T>(endpoint, params), successMsg, failMsg, transform?))`.
`buildToolResponse` returns compact JSON after the message plus `structuredContent` (lists as `{ items }`), a plain-text body for string data, the cache `notice` as a prefix, and `isError: true` with the failure message on errors.

## Testing

- Unit tests mock `makeSejmRequest` via `jest.mock`
- Integration tests (`tests/integration/`) call the real API — gated by `RUN_LIVE_API_TESTS=true`
- CI: the `live-api` job on PRs is informational (skipped when the API probe gets 5xx, never fails the PR); the daily `live-api-tests` workflow on main is the API health check
- Each tool has its own test file in `tests/tools/`
- `tests/mcp.test.ts` exercises the server through an MCP client (tool list, output validation); the live test runs every tool through MCP

## Build

esbuild bundles everything into a single `build/index.mjs` with `#!/usr/bin/env node` banner. The `@modelcontextprotocol/sdk` is external (peer dependency at runtime via npx).

## Conventions

- The registry key is the MCP tool name, in kebab-case (`get-members`, `get-club`); renaming one is a breaking change
- Every tool is registered with `readOnlyHint: true` and `openWorldHint: true`
- `term` is optional in every tool (`term()` from `params.ts`) and resolved with `withTerm`
- Descriptions are written for LLMs: explain Polish terms (posiedzenie, druk, klub…), date formats and which tool provides each ID
- JSON tools declare an `outputSchema`; plain-text tools (`get-statement`, `get-interpellation-text`) do not
- Lists the API returns whole (no documented `offset`/`limit`) are fetched without them and filtered and paginated in the transform with `paginate` (output schema `pagedListOutput`, message from `describePage`); text filters use `wordMatcher` from `src/utils/text.ts`, which ignores case and Polish diacritics
- In a `buildToolResponse` call whose success message is a function, type the transform's parameter (e.g. `(mps: Mp[]) => paginate(...)`), otherwise TypeScript infers the message's argument as the untransformed data
- Output schemas stay lenient (optional, nullable, passthrough): a stricter schema makes the SDK reject live responses

@TODO.md
