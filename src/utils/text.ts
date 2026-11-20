/**
 * Lower-cases the text and strips Polish (and other) diacritics, so that "Hołownia", "HOLOWNIA" and
 * "holownia" compare equal. LLMs and users often type Polish names without diacritics.
 */
export function normalizeText(text: string): string {
  return (
    text
      .toLowerCase()
      .normalize("NFD")
      .replace(/\p{M}/gu, "")
      // "ł" has no decomposition into "l" plus a combining mark.
      .replace(/ł/g, "l")
  );
}

/**
 * Returns a predicate that tells whether every word of `query` occurs somewhere in the given
 * texts, ignoring case, diacritics and word order. Words match as substrings, so a stem such as
 * "podatk" matches the inflected forms "podatku" and "podatkowy".
 */
export function wordMatcher(query: string): (...texts: (string | null | undefined)[]) => boolean {
  const words = normalizeText(query).split(/\s+/).filter(Boolean);
  return (...texts) => {
    const haystack = normalizeText(texts.filter((text): text is string => !!text).join(" "));
    return words.every((word) => haystack.includes(word));
  };
}
