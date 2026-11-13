import { z } from "zod";
import { makeSejmRequest } from "../utils/api.js";
import { actHtmlToText } from "../utils/html.js";
import type { Act, ActList, ActReference, ActUnit } from "../types/api.js";

const ELI_API_BASE = "https://api.sejm.gov.pl/eli";
const DATE = /^\d{4}-\d{2}-\d{2}$/;
// "415", "3a", "18^3a" as printed in the text, or "18_3_a" as named in the structure of the act.
const ARTICLE = /^\d+[a-z]*(\^[0-9a-z]+|(_[0-9a-z]+)*)$/i;

const DEFAULT_SEARCH_LIMIT = 20;
const MAX_SEARCH_LIMIT = 100;
/** Acts with more references get a summary per type; the Constitution alone has over 3,500. */
const MAX_LISTED_REFERENCES = 30;
const NEWEST_REFERENCES = 5;
/** About 6,000 tokens of Polish text; whole codes are over 400,000 characters. */
const DEFAULT_TEXT_LENGTH = 20_000;
const MAX_TEXT_LENGTH = 100_000;
/** The HTML of a whole code is over 2 MB and takes the API several seconds to send. */
const ACT_TEXT_TIMEOUT_MS = 30_000;
const MAX_ARTICLE_MATCHES = 5;

const publisher = z
  .enum(["DU", "MP"])
  .describe("Journal the act was published in: DU for Dziennik Ustaw or MP for Monitor Polski");

/** Identifies an act by publisher, year and position, which together form its ELI. */
const actSchema = {
  publisher: publisher.describe(
    "Journal the act was published in: DU for Dziennik Ustaw or MP for Monitor Polski. " +
      "The ELI field of a legislative process (get-process, get-passed-processes) such as DU/2024/1 " +
      "is exactly publisher/year/position, and so is the ELI of acts from search-acts"
  ),
  year: z.number().int().positive().describe("Year of publication: the middle part of the ELI (2024 in DU/2024/1)"),
  position: z.number().int().positive().describe("Position in the journal: the last part of the ELI (1 in DU/2024/1)"),
};

type ActArgs = { publisher: "DU" | "MP"; year: number; position: number };

type ToolResult = { content: { type: "text"; text: string }[]; isError?: boolean };

function failure(text: string): ToolResult {
  return { content: [{ type: "text", text }], isError: true };
}

function success(text: string): ToolResult {
  return { content: [{ type: "text", text }] };
}

function onlyPdf(eli: string, notice = "") {
  return success(
    `${notice}Legal act ${eli} has no HTML text in the ELI API; its text is only in the PDF: ${ELI_API_BASE}/acts/${eli}/text.pdf`
  );
}

export const searchActsTool = {
  description: "Search Polish legal acts in Dziennik Ustaw and Monitor Polski",
  schema: {
    title: z.string().optional().describe("Words to find in the title, in Polish (e.g. kodeks cywilny)"),
    publisher: publisher.optional(),
    year: z.number().int().positive().optional().describe("Year of publication"),
    type: z
      .string()
      .optional()
      .describe(
        "Type of act, e.g. Ustawa, Rozporządzenie, Obwieszczenie (consolidated texts are announced by one), " +
          "Uchwała, Zarządzenie or Umowa międzynarodowa; several types separated by commas"
      ),
    keywords: z
      .array(z.string().min(1))
      .optional()
      .describe("Keywords the acts must all have, exactly as listed by get-act-keywords (e.g. kodeks cywilny)"),
    inForce: z.boolean().optional().describe("true to return only acts in force"),
    dateFrom: z.string().regex(DATE, "Expected a date in YYYY-MM-DD format").optional().describe("Earliest date of the act (its signing) in YYYY-MM-DD format"),
    dateTo: z.string().regex(DATE, "Expected a date in YYYY-MM-DD format").optional().describe("Latest date of the act (its signing) in YYYY-MM-DD format"),
    pubDateFrom: z.string().regex(DATE, "Expected a date in YYYY-MM-DD format").optional().describe("Earliest publication date in YYYY-MM-DD format"),
    pubDateTo: z.string().regex(DATE, "Expected a date in YYYY-MM-DD format").optional().describe("Latest publication date in YYYY-MM-DD format"),
    dateEffectFrom: z.string().regex(DATE, "Expected a date in YYYY-MM-DD format").optional().describe("Earliest date of entry into force in YYYY-MM-DD format"),
    dateEffectTo: z.string().regex(DATE, "Expected a date in YYYY-MM-DD format").optional().describe("Latest date of entry into force in YYYY-MM-DD format"),
    sortBy: z
      .enum(["publisher", "position", "title", "change"])
      .optional()
      .describe("Sort by publisher (default; newest acts first within a journal), position, title or change (time of the last change of the act's data)"),
    sortDir: z.enum(["asc", "desc"]).optional().describe("Sort direction"),
    offset: z.number().int().nonnegative().optional().describe("Offset for pagination"),
    limit: z
      .number()
      .int()
      .positive()
      .max(MAX_SEARCH_LIMIT)
      .optional()
      .describe(`Limit for pagination; defaults to ${DEFAULT_SEARCH_LIMIT}`),
  },
  handler: async (args: {
    title?: string;
    publisher?: "DU" | "MP";
    year?: number;
    type?: string;
    keywords?: string[];
    inForce?: boolean;
    dateFrom?: string;
    dateTo?: string;
    pubDateFrom?: string;
    pubDateTo?: string;
    dateEffectFrom?: string;
    dateEffectTo?: string;
    sortBy?: "publisher" | "position" | "title" | "change";
    sortDir?: "asc" | "desc";
    offset?: number;
    limit?: number;
  }) => {
    const { keywords, inForce: onlyInForce, limit, ...filters } = args;
    const acts = await makeSejmRequest<ActList>(
      "/acts/search",
      {
        ...filters,
        keyword: keywords?.join(","),
        inForce: onlyInForce ? "1" : undefined,
        limit: limit ?? DEFAULT_SEARCH_LIMIT,
      },
      { api: "eli" }
    );

    if (!acts.ok) {
      return failure(`Failed to search legal acts.\n\nError: ${acts.error.message}`);
    }

    const { totalCount, offset, count } = acts.data;
    // Search results carry every detail of an act, references included; get-act returns them for one act.
    const items = acts.data.items.map(
      ({ ELI, displayAddress, title, type, status, inForce, announcementDate, promulgation, entryIntoForce, textHTML }) => ({
        ELI,
        displayAddress,
        title,
        type,
        status,
        inForce,
        announcementDate,
        promulgation,
        entryIntoForce,
        textHTML,
      })
    );
    const range =
      count < totalCount
        ? `; showing ${offset + 1}-${offset + count}${offset + count < totalCount ? `, pass offset=${offset + count} for more` : ""}`
        : "";

    return success(
      `${acts.notice ?? ""}Found ${totalCount} legal acts${range}:\n\n${JSON.stringify(items, null, 2)}`
    );
  },
};

function referenceCount(references: Record<string, ActReference[]>): number {
  return Object.values(references).reduce((sum, list) => sum + list.length, 0);
}

/** Newest first: by year, then position, from an ELI such as DU/2024/1. */
function byNewest(a: ActReference, b: ActReference): number {
  const [, yearA = 0, posA = 0] = a.id.split("/").map(Number);
  const [, yearB = 0, posB = 0] = b.id.split("/").map(Number);
  return yearB - yearA || posB - posA;
}

export const getActTool = {
  description: "Get details of a Polish legal act",
  schema: {
    ...actSchema,
    referenceType: z
      .string()
      .optional()
      .describe(
        "Return all references of one type, e.g. Akty zmieniające (amending acts), Akty wykonawcze (implementing acts), " +
          "Inf. o tekście jednolitym (consolidated texts), Akty uchylone (repealed acts) or Podstawa prawna (legal basis)"
      ),
  },
  handler: async (args: ActArgs & { referenceType?: string }) => {
    const { publisher, year, position, referenceType } = args;
    const eli = `${publisher}/${year}/${position}`;
    const act = await makeSejmRequest<Act>(`/acts/${eli}`, undefined, { api: "eli" });

    if (!act.ok) {
      return failure(`Failed to fetch legal act ${eli}.\n\nError: ${act.error.message}`);
    }

    const { references = {}, ...details } = act.data;
    const total = referenceCount(references);
    let note = "";
    let shownReferences: unknown = references;
    if (referenceType !== undefined) {
      shownReferences = { [referenceType]: references[referenceType] ?? [] };
      if (!(referenceType in references)) {
        const types = Object.keys(references);
        note = `The act has no references of type "${referenceType}"; its reference types are: ${types.length ? types.join(", ") : "none"}.\n\n`;
      }
    } else if (total > MAX_LISTED_REFERENCES) {
      shownReferences = Object.fromEntries(
        Object.entries(references).map(([type, list]) => [
          type,
          { count: list.length, newest: [...list].sort(byNewest).slice(0, NEWEST_REFERENCES) },
        ])
      );
      note =
        `The act has ${total} references to other acts, so only their number and the newest ${NEWEST_REFERENCES} ` +
        "of each type are shown; pass referenceType to list all references of one type.\n\n";
    }

    return success(
      `${act.notice ?? ""}Fetched legal act ${eli} (${details.displayAddress}):\n\n${note}` +
        JSON.stringify({ ...details, references: shownReferences }, null, 2)
    );
  },
};

/** Converts an article as printed (18^3a) to its name in the structure of the act (18_3_a). */
function articleName(article: string): string {
  const [number, superscript] = article.toLowerCase().split("^");
  return superscript ? [number, ...(superscript.match(/\d+|[a-z]+/g) ?? [])].join("_") : number;
}

interface ArticleMatch {
  /** Path for the text.html fragment endpoint, e.g. book=pierwsza/part=og%C3%B3lna/titl=I/arti=1. */
  path: string;
  /** Titles of the enclosing units, e.g. Księga pierwsza > Część ogólna > Tytuł I - Przepisy wstępne. */
  location: string[];
}

function findArticles(units: ActUnit[], name: string, parent: ArticleMatch = { path: "", location: [] }): ArticleMatch[] {
  const matches: ArticleMatch[] = [];
  for (const unit of units) {
    if (unit.type === "arti" && unit.name?.toLowerCase() === name) {
      matches.push({ path: `${parent.path}arti=${encodeURIComponent(unit.name)}`, location: parent.location });
    } else if (unit.children) {
      // Top-level parts of the document (the act and its annexes) have no name and are not part of the path.
      const segment = unit.name ? `${encodeURIComponent(unit.type)}=${encodeURIComponent(unit.name)}/` : "";
      const location = unit.title ? [...parent.location, unit.title] : parent.location;
      matches.push(...findArticles(unit.children, name, { path: parent.path + segment, location }));
    }
  }
  return matches;
}

/** Articles as printed: 18^3a for the unit named 18_3_a. */
function articleNames(units: ActUnit[]): string[] {
  return units.flatMap((unit) => [
    ...(unit.type === "arti" && unit.name ? [unit.name.replace("_", "^").replace(/_/g, "")] : []),
    ...articleNames(unit.children ?? []),
  ]);
}

export const getActTextTool = {
  description: "Get the text of a Polish legal act or of one of its articles",
  schema: {
    ...actSchema,
    article: z
      .string()
      .regex(ARTICLE, "Expected an article number such as 415, 3a or 18^3a")
      .optional()
      .describe(
        "Return only this article, e.g. 415, 3a or 18^3a for Art. 18 with superscript 3a. " +
          "Omit to get the whole act, which for codes is over 400,000 characters. " +
          "The text is the act as published; the current wording of an amended act is in its newest " +
          "consolidated text (references of type Inf. o tekście jednolitym in get-act)"
      ),
    offset: z
      .number()
      .int()
      .nonnegative()
      .optional()
      .describe("Character at which to start; use the offset given at the end of a truncated text to continue"),
    maxLength: z
      .number()
      .int()
      .positive()
      .max(MAX_TEXT_LENGTH)
      .optional()
      .describe(`Maximum number of characters to return; defaults to ${DEFAULT_TEXT_LENGTH}`),
  },
  handler: async (args: ActArgs & { article?: string; offset?: number; maxLength?: number }) => {
    const { publisher, year, position, article, offset = 0, maxLength = DEFAULT_TEXT_LENGTH } = args;
    const eli = `${publisher}/${year}/${position}`;
    const subject = article ? `article ${article} of legal act ${eli}` : `legal act ${eli}`;
    let text: string;
    let notice: string | undefined;

    if (article) {
      const structure = await makeSejmRequest<ActUnit[]>(`/acts/${eli}/struct`, undefined, { api: "eli" });
      if (!structure.ok) {
        if (structure.error.status === 404) {
          // Acts published only as a PDF have no structure either.
          const act = await makeSejmRequest<Act>(`/acts/${eli}`, undefined, { api: "eli" });
          if (act.ok && !act.data.textHTML) {
            return onlyPdf(eli, act.notice);
          }
        }
        return failure(`Failed to fetch the structure of legal act ${eli}.\n\nError: ${structure.error.message}`);
      }

      const matches = findArticles(structure.data, articleName(article)).slice(0, MAX_ARTICLE_MATCHES);
      if (matches.length === 0) {
        const names = articleNames(structure.data);
        const listed = names.slice(0, 30).join(", ");
        return failure(
          `Article ${article} was not found in legal act ${eli}. ` +
            (names.length
              ? `The act has ${names.length} articles: ${listed}${names.length > 30 ? ", ..." : ""}`
              : "The act has no articles; get its whole text instead.")
        );
      }

      const fragments = await Promise.all(
        matches.map(({ path }) =>
          makeSejmRequest<string>(`/acts/${eli}/text.html/${path}`, undefined, { api: "eli", format: "html" })
        )
      );
      // An article number can recur, e.g. in the announcement of a consolidated text quoting an amending
      // act, so each article is preceded by where it is in the act.
      const articles: string[] = [];
      for (const [i, fragment] of fragments.entries()) {
        if (!fragment.ok) {
          return failure(`Failed to fetch the text of ${subject}.\n\nError: ${fragment.error.message}`);
        }
        notice ??= fragment.notice;
        const articleText = actHtmlToText(fragment.data);
        if (articleText) {
          const { location } = matches[i];
          articles.push(location.length ? `[${location.join(" > ")}]\n${articleText}` : articleText);
        }
      }
      text = articles.join("\n\n");
      notice = structure.notice ?? notice;
    } else {
      const response = await makeSejmRequest<string>(`/acts/${eli}/text.html`, undefined, {
        api: "eli",
        format: "html",
        timeoutMs: ACT_TEXT_TIMEOUT_MS,
      });
      if (!response.ok) {
        return failure(`Failed to fetch the text of ${subject}.\n\nError: ${response.error.message}`);
      }
      text = actHtmlToText(response.data);
      notice = response.notice;
    }

    if (!text) {
      // The API answers 200 with an empty body for acts that were published only as a PDF.
      return onlyPdf(eli, notice);
    }
    if (offset >= text.length) {
      return failure(`Offset ${offset} is beyond the end of the text of ${subject}, which has ${text.length} characters.`);
    }

    let end = Math.min(offset + maxLength, text.length);
    if (end < text.length) {
      // Prefer to stop at the end of a line in the second half of the requested range.
      const lineEnd = text.lastIndexOf("\n", end);
      if (lineEnd > offset + maxLength / 2) {
        end = lineEnd;
      }
    }
    const range = `characters ${offset}-${end} of ${text.length}`;
    const more =
      end < text.length
        ? `\n\n[Truncated: ${text.length - end} more characters. Call again with offset=${end} to continue` +
          `${article ? "" : " or pass article to get a single article"}.]`
        : "";

    return success(
      `${notice ?? ""}Fetched the text of ${subject} (${range}):\n\n${text.slice(offset, end).trim()}${more}`
    );
  },
};

/** Lower case without diacritics, so that "podatek" also finds "Podatek" and "zrodla" finds "źródła". */
function fold(text: string): string {
  return text.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/ł/g, "l");
}

export const getActKeywordsTool = {
  description: "List keywords used to classify Polish legal acts",
  schema: {
    query: z
      .string()
      .optional()
      .describe("Part of a keyword to look for, ignoring case and Polish diacritics (e.g. podat); omit to list all of about 2,500"),
  },
  handler: async (args: { query?: string }) => {
    const { query } = args;
    const keywords = await makeSejmRequest<string[]>("/keywords", undefined, { api: "eli" });

    if (!keywords.ok) {
      return failure(`Failed to fetch the keywords of legal acts.\n\nError: ${keywords.error.message}`);
    }

    const needle = fold(query ?? "");
    const matching = keywords.data.filter((keyword) => fold(keyword).includes(needle));
    return success(
      `${keywords.notice ?? ""}Found ${matching.length} keywords of legal acts${query ? ` matching "${query}"` : ""}:\n\n${matching.join("\n")}`
    );
  },
};
