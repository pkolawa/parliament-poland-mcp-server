#!/usr/bin/env node
// Starts the built server over stdio, as an MCP client would, and checks that it
// answers `initialize` and `tools/list`. Catches bundling problems that unit tests
// cannot see, such as the external @modelcontextprotocol/sdk failing to resolve.
//
// Usage: node scripts/smoke-test.mjs [path to built server, default build/index.mjs]

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const entry = process.argv[2] ?? "build/index.mjs";
const TIMEOUT_MS = 15_000;

const client = new Client({ name: "smoke-test", version: "0.0.0" });
const transport = new StdioClientTransport({ command: process.execPath, args: [entry] });

const timeout = setTimeout(() => {
  console.error(`Smoke test failed: no answer from ${entry} within ${TIMEOUT_MS / 1000}s`);
  process.exit(1);
}, TIMEOUT_MS);

try {
  await client.connect(transport);
  const { tools } = await client.listTools();
  if (tools.length === 0) {
    throw new Error("tools/list returned no tools");
  }
  const server = client.getServerVersion();
  console.log(`${server?.name} ${server?.version} on Node ${process.version}: ${tools.length} tools`);
} catch (error) {
  console.error(`Smoke test failed: ${error instanceof Error ? error.message : error}`);
  process.exitCode = 1;
} finally {
  clearTimeout(timeout);
  await client.close();
}
