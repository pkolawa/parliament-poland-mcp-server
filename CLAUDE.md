# CLAUDE.md

## Project

Parliament Poland MCP Server — TypeScript MCP server exposing the Polish Parliament public API (api.sejm.gov.pl) as tools for LLMs.

## Stack

- TypeScript (ESM, strict mode)
- @modelcontextprotocol/sdk (MCP server framework)
- Zod (input schema validation)
- esbuild (bundler → build/index.mjs)
- Jest + ts-jest (testing)
- Node 18+

## Commands

- `npm test` — run unit tests
- `npm run test:live-api` — run integration tests against live Sejm API (requires internet)
- `npm run build` — run tests then bundle with esbuild
- `npm start` — run the built server

## Architecture

- `src/index.ts` — entry point, stdio transport
- `src/server.ts` — registers all tools with McpServer
- `src/utils/api.ts` — HTTP client (`makeSejmRequest`)
- `src/tools/*.ts` — each file exports tool objects with `{ description, schema, handler }`
- `src/tools/index.ts` — aggregates all tools into a single map

Tool pattern: handler calls `makeSejmRequest`, returns `{ content: [{ type: "text", text }] }`.

## Testing

- Unit tests mock `makeSejmRequest` via `jest.mock`
- Integration tests (`tests/integration/`) call the real API — gated by `RUN_LIVE_API_TESTS=true`
- Each tool has its own test file in `tests/tools/`

## Build

esbuild bundles everything into a single `build/index.mjs` with `#!/usr/bin/env node` banner. The `@modelcontextprotocol/sdk` is external (peer dependency at runtime via npx).

## Conventions

- Tool names use kebab-case in the registry (`get-members`, `get-club`)
- MCP tool IDs are derived from description with spaces replaced by dashes
- All handlers return MCP content format with `type: "text"`

@TODO.md
