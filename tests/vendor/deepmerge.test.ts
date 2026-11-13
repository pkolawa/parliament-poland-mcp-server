import { realpathSync } from "node:fs";
import { dirname, join } from "node:path";
import deepmerge from "deepmerge";

// deepmerge (used by jest-config) has an unfixed prototype poisoning advisory, GHSA-gcqx-w48m-w2h4.
// package.json overrides it with the patched copy in vendor/deepmerge; these tests fail on upstream 4.3.1.

function malicious(): Record<string, unknown> {
  return JSON.parse('{ "__proto__": { "admin": true }, "safe": true }');
}

function expectNotPoisoned(result: Record<string, unknown>) {
  expect(Object.getPrototypeOf(result)).toBe(Object.prototype);
  expect(Object.prototype.hasOwnProperty.call(result, "__proto__")).toBe(false);
  expect(result.admin).toBeUndefined();
}

describe("vendored deepmerge", () => {
  it("is the copy that jest-config loads", () => {
    const fromJestConfig = require.resolve("deepmerge", {
      paths: [dirname(require.resolve("jest-config"))],
    });

    expect(realpathSync(fromJestConfig)).toBe(
      realpathSync(join(__dirname, "../../vendor/deepmerge/dist/cjs.js"))
    );
  });

  it("ignores __proto__ in the source object", () => {
    const result = deepmerge<Record<string, unknown>>({}, malicious());

    expectNotPoisoned(result);
    expect(result.safe).toBe(true);
  });

  it("ignores __proto__ in the target object, with and without cloning", () => {
    for (const clone of [true, false]) {
      const result = deepmerge<Record<string, unknown>>(malicious(), { added: true }, { clone });

      expectNotPoisoned(result);
      expect(result).toEqual({ safe: true, added: true });
    }
  });

  it("ignores __proto__ when merging into a null-prototype target", () => {
    expectNotPoisoned(deepmerge<Record<string, unknown>>(Object.create(null), malicious()));
  });

  it("still deep-merges objects and concatenates arrays as jest-config expects", () => {
    const defaults = { testEnvironment: "node", transform: { a: 1 }, roots: ["src"] };
    const overrides = { transform: { b: 2 }, roots: ["tests"] };

    expect(deepmerge.all([defaults, overrides])).toEqual({
      testEnvironment: "node",
      transform: { a: 1, b: 2 },
      roots: ["src", "tests"],
    });
  });
});
