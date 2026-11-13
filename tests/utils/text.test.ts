import { normalizeText, wordMatcher } from "../../src/utils/text.js";

describe("normalizeText", () => {
  it("lower-cases and strips Polish diacritics, including ł", () => {
    expect(normalizeText("Szymon HOŁOWNIA")).toBe("szymon holownia");
    expect(normalizeText("Zażółć gęślą jaźń")).toBe("zazolc gesla jazn");
    expect(normalizeText("Łódź, ŚLĄSKIE")).toBe("lodz, slaskie");
  });
});

describe("wordMatcher", () => {
  it("matches when every word occurs in the texts, in any order", () => {
    const matches = wordMatcher("Hołownia Szymon");

    expect(matches("Szymon Hołownia")).toBe(true);
    expect(matches("Szymon", "Hołownia")).toBe(true);
    expect(matches("Szymon Kowalski")).toBe(false);
  });

  it("ignores case and diacritics on both sides and matches stems", () => {
    expect(wordMatcher("holownia")("Szymon Hołownia")).toBe(true);
    expect(wordMatcher("BUDŻET")("ustawa budzetowa")).toBe(true);
    expect(wordMatcher("podatk")("o podatku dochodowym")).toBe(true);
  });

  it("skips missing texts", () => {
    expect(wordMatcher("poprawka")(undefined, null, "Głosowanie nad poprawką 3")).toBe(true);
    expect(wordMatcher("ustawa")(undefined, null, "Głosowanie nad poprawką 3")).toBe(false);
  });
});
