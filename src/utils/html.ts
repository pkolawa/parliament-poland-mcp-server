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
    // Superscripts number inserted articles and units (Art. 18<sup>3a</sup> is "Art. 18^3a").
    .replace(/<\/sup>\s*<sup\b[^>]*>/gi, "")
    .replace(/<sup\b[^>]*>/gi, "^")
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

// A line holding only the label of a unit of an act: "Art. 18^3a.", "§ 1.", "2.", "3a)" or "b)".
const UNIT_LABEL = /^(Art\. ?|§ ?)?\d+[a-z]*(\^[0-9a-z]+)?\.$|^\d+[a-z]*(\^[0-9a-z]+)?\)$|^[a-z]{1,3}(\^[0-9a-z]+)?\)$/;

/**
 * Converts the HTML text of a legal act from the ELI API to plain text laid out as acts are
 * printed: a unit label starts the line of its content ("Art. 5. 1. Treść"), not a line of its own.
 */
export function actHtmlToText(html: string): string {
  const text = htmlToText(
    html
      // The heading is made of inline spans for the type, date and subject of the act.
      .replace(/<span class="head-[^"]*">/gi, "<br>")
      .replace(/<button\b[\s\S]*?<\/button>/gi, "")
      // Footnotes are tooltips next to their marker; they often say which act added or changed a unit.
      .replace(/<a class="gloss-link[^"]*"[^>]*>([\s\S]*?)<\/a>/gi, (_link, inner: string) => {
        const footnote = inner.match(/^\s*<sup\b[^>]*>([\s\S]*?)\)?<\/sup>([\s\S]*)$/i);
        return footnote ? ` [footnote ${footnote[1]}: ${footnote[2]}]` : ` [footnote: ${inner}]`;
      })
  );

  const lines: string[] = [];
  let labels = "";
  for (const line of text.split("\n")) {
    if (UNIT_LABEL.test(line)) {
      labels += `${line} `;
    } else if (!labels) {
      lines.push(line);
    } else if (line) {
      lines.push(labels + line);
      labels = "";
    }
  }
  if (labels) {
    lines.push(labels.trimEnd());
  }
  return lines.join("\n").trim();
}
