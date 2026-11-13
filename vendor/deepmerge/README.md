# deepmerge 4.3.1, patched

This is [deepmerge](https://github.com/TehShrike/deepmerge) 4.3.1 (MIT, see `license.txt`) with one change. It fixes the prototype poisoning advisory [GHSA-gcqx-w48m-w2h4](https://github.com/advisories/GHSA-gcqx-w48m-w2h4), which affects every published release.

**Why it is here.** Only `jest-config`, a development dependency, uses it, and no fixed release of deepmerge exists. The root `package.json` points `jest-config` to this copy through `overrides`. Nothing in the published package uses deepmerge.

**The change.** `getKeys()` in `dist/cjs.js` skips the `__proto__` key. This is the fix proposed upstream in [TehShrike/deepmerge#286](https://github.com/TehShrike/deepmerge/pull/286). Merging an object with an own `__proto__` key could otherwise set the prototype of the merged result. The rest of the file and `index.d.ts` are unchanged from the 4.3.1 release.

**Package name.** The copy is named `parliament-poland-mcp-deepmerge-patched` in its `package.json`. `npm audit` matches advisories by package name and version, so a copy named `deepmerge` 4.3.1 would still be reported. The root `package.json` installs it as the `deepmerge` dev dependency (`file:vendor/deepmerge`), and `overrides` points every `deepmerge` dependency to it (`$deepmerge`). As a result it sits in `node_modules/deepmerge`, where `require("deepmerge")` finds it. A relative `file:` path written directly in `overrides` does not work here: npm resolves it against `jest-config`'s directory.

**Test.** `tests/vendor/deepmerge.test.ts` checks two things: that `jest-config` loads this copy, and that `__proto__` is ignored. Two of its tests fail on upstream 4.3.1.

**When to remove.** Delete this directory and the `deepmerge` entry in `overrides` once deepmerge publishes a fixed release, or once Jest stops depending on it. Then run `npm audit`.
