// Marks the start of a list item until the text is laid out; never occurs in API content.
const BULLET = "\u0001";

const NAMED_ENTITIES: Record<string, string> = {
  nbsp: " ",
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
};

function decodeEntities(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (entity, code: string) => {
    if (code[0] === "#") {
      const point = code[1].toLowerCase() === "x" ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
      return Number.isFinite(point) ? String.fromCodePoint(point) : entity;
    }
    return NAMED_ENTITIES[code.toLowerCase()] ?? entity;
  });
}

/**
 * Converts an HTML document or fragment from the Sejm API (statements, interpellations,
 * agendas) to plain text, which costs the LLM far fewer tokens than the markup.
 */
export function htmlToText(html: string): string {
  const text = html
    .replace(/<(head|script|style)\b[\s\S]*?<\/\1>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    // Line breaks in the source are only wrapping; block elements mark real breaks.
    .replace(/\s+/g, " ")
    .replace(/<li\b[^>]*>/gi, BULLET)
    .replace(/<(br|\/?(p|div|h[1-6]|ol|ul|li|tr|table|blockquote))\b[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, "");

  return decodeEntities(text)
    .split("\n")
    .map((line) => line.replace(/[ \t\u00a0]+/g, " ").trim())
    .join("\n")
    // Block elements around and inside list items leave blank lines; each item takes exactly one line.
    .replace(new RegExp(`${BULLET}\\s*`, "g"), BULLET)
    .replace(new RegExp(`\\n*${BULLET}`, "g"), "\n- ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
