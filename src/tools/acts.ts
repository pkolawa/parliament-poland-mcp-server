import { z } from "zod";
import { makeSejmRequest } from "../utils/api.js";
import { actHtmlToText } from "../utils/html.js";
import {
  buildToolResponse,
  defineTool,
  errorResponse,
  listOutput,
  objectOutput,
  type ToolResponse,
} from "../utils/tool.js";
import {
  ActSchema,
  ActSummarySchema,
  type Act,
  type ActList,
  type ActReference,
  type ActUnit,
} from "../types/api.js";
import { date, offset } from "./params.js";

const ELI_API_BASE = "https://api.sejm.gov.pl/eli";
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

const publisher = (description: string) => z.enum(["DU", "MP"]).describe(description);

/** Identifies an act by publisher, year and position, which together form its ELI. */
const actParams = () => ({
  publisher: publisher(
    "Journal the act was published in: DU for Dziennik Ustaw or MP for Monitor Polski. " +
      "The ELI field of a legislative process (get-process, get-passed-processes) such as DU/2024/1 " +
      "is exactly publisher/year/position, and so is the ELI of acts from search-acts"
  ),
  year: z.number().int().positive().describe("Year of publication: the middle part of the ELI (2024 in DU/2024/1)"),
  position: z.number().int().positive().describe("Position in the journal: the last part of the ELI (1 in DU/2024/1)"),
});

function onlyPdf(eli: string, notice?: string): ToolResponse {
  return buildToolResponse(
    { ok: true, data: `Its text is only in the PDF: ${ELI_API_BASE}/acts/${eli}/text.pdf`, notice },
    `Legal act ${eli} has no HTML text in the ELI API.`,
    ""
  );
}

export const searchActsTool = defineTool({
  title: "Search legal acts",
  description:
    "Search Polish legal acts published in Dziennik Ustaw (DU, statutes and regulations) and Monitor Polski " +
    "(MP, resolutions and announcements) by title, type, keywords, whether they are in force, and dates. " +
    "Returns a compact list; get-act gives the details of one act and get-act-text its text.",
  schema: {
    title: z.string().min(1).optional().describe("Words to find in the title, in Polish (e.g. kodeks cywilny)"),
    publisher: publisher("Journal: DU for Dziennik Ustaw or MP for Monitor Polski").optional(),
    year: z.number().int().positive().optional().describe("Year of publication"),
    type: z
      .string()
      .min(1)
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
    dateFrom: date("Earliest date of the act (its signing)").optional(),
    dateTo: date("Latest date of the act (its signing)").optional(),
    pubDateFrom: date("Earliest publication date").optional(),
    pubDateTo: date("Latest publication date").optional(),
    dateEffectFrom: date("Earliest date of entry into force").optional(),
    dateEffectTo: date("Latest date of entry into force").optional(),
    sortBy: z
      .enum(["publisher", "position", "title", "change"])
      .optional()
      .describe(
        "Sort by publisher (default; newest acts first within a journal), position, title or change " +
          "(time of the last change of the act's data)"
      ),
    sortDir: z.enum(["asc", "desc"]).optional().describe("Sort direction"),
    offset: offset(),
    limit: z
      .number()
      .int()
      .positive()
      .max(MAX_SEARCH_LIMIT)
      .optional()
      .describe(`Maximum number of acts to return; defaults to ${DEFAULT_SEARCH_LIMIT}, at most ${MAX_SEARCH_LIMIT}`),
  },
  outputSchema: objectOutput(
    z
      .object({
        totalCount: z.number().nullish().describe("Number of acts that match the search"),
        offset: z.number().nullish(),
        count: z.number().nullish().describe("Number of acts in this response"),
        items: z.array(ActSummarySchema),
      })
      .passthrough()
  ),
  handler: async ({ keywords, inForce, limit, ...filters }) =>
    buildToolResponse(
      await makeSejmRequest<ActList>(
        "/acts/search",
        {
          ...filters,
          keyword: keywords?.join(","),
          inForce: inForce ? "1" : undefined,
          limit: limit ?? DEFAULT_SEARCH_LIMIT,
        },
        { api: "eli" }
      ),
      ({ totalCount, offset, count }: { totalCount: number; offset: number; count: number }) => {
        const range =
          count < totalCount
            ? `; showing ${offset + 1}-${offset + count}` +
              (offset + count < totalCount ? `, pass offset=${offset + count} for more` : "")
            : "";
        return `Found ${totalCount} legal acts${range}:`;
      },
      "Failed to search legal acts.",
      // Search results carry every detail of an act, references included; get-act returns them for one act.
      (list) => ({
        totalCount: list.totalCount ?? 0,
        offset: list.offset ?? 0,
        count: list.count ?? 0,
        items: (list.items ?? []).map(
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
        ),
      })
    ),
});

function referenceCount(references: Record<string, ActReference[]>): number {
  return Object.values(references).reduce((sum, list) => sum + list.length, 0);
}

/** Newest first: by year, then position, from an ELI such as DU/2024/1. */
function byNewest(a: ActReference, b: ActReference): number {
  const [, yearA = 0, posA = 0] = a.id.split("/").map(Number);
  const [, yearB = 0, posB = 0] = b.id.split("/").map(Number);
  return yearB - yearA || posB - posA;
}

export const getActTool = defineTool({
  title: "Get a legal act",
  description:
    "Get the details of a Polish legal act: status, dates, keywords, issuing authority, the Sejm prints of " +
    "the bill and references to other acts (amending acts, consolidated texts, implementing acts…). " +
    "Long reference lists are summarized per type; referenceType lists one type in full.",
  schema: {
    ...actParams(),
    referenceType: z
      .string()
      .min(1)
      .optional()
      .describe(
        "Return all references of one type, e.g. Akty zmieniające (amending acts), Akty wykonawcze (implementing acts), " +
          "Inf. o tekście jednolitym (consolidated texts), Akty uchylone (repealed acts) or Podstawa prawna (legal basis)"
      ),
  },
  outputSchema: objectOutput(ActSchema),
  handler: async ({ publisher, year, position, referenceType }) => {
    const eli = `${publisher}/${year}/${position}`;
    // Set while shaping the data and shown before it: why the references are summarized or missing.
    let note = "";

    return buildToolResponse(
      await makeSejmRequest<Act>(`/acts/${eli}`, undefined, { api: "eli" }),
      (act) => `Fetched legal act ${eli} (${act.displayAddress}):${note ? `\n\n${note}` : ""}`,
      `Failed to fetch legal act ${eli}.`,
      (act): Act => {
        const { references, ...details } = act;
        const all = (references ?? {}) as Record<string, ActReference[]>;
        const total = referenceCount(all);
        let shown: Record<string, unknown> = all;

        if (referenceType !== undefined) {
          shown = { [referenceType]: all[referenceType] ?? [] };
          if (!(referenceType in all)) {
            const types = Object.keys(all);
            note = `The act has no references of type "${referenceType}"; its reference types are: ${types.length ? types.join(", ") : "none"}.`;
          }
        } else if (total > MAX_LISTED_REFERENCES) {
          shown = Object.fromEntries(
            Object.entries(all).map(([type, list]) => [
              type,
              { count: list.length, newest: [...list].sort(byNewest).slice(0, NEWEST_REFERENCES) },
            ])
          );
          note =
            `The act has ${total} references to other acts, so only their number and the newest ${NEWEST_REFERENCES} ` +
            "of each type are shown; pass referenceType to list all references of one type.";
        }

        return { ...details, references: shown };
      }
    );
  },
});

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

export const getActTextTool = defineTool({
  title: "Get the text of a legal act",
  description:
    "Get the text of a Polish legal act, or of one of its articles, as plain text. Whole acts come in pages " +
    `of ${DEFAULT_TEXT_LENGTH.toLocaleString("en")} characters by default (codes are over 400,000); continue with offset. ` +
    "The text is the act as published: the current wording of an amended act is in its newest consolidated text " +
    "(references of type Inf. o tekście jednolitym in get-act). Acts published only as a PDF return the PDF link.",
  schema: {
    ...actParams(),
    article: z
      .string()
      .regex(ARTICLE, "Expected an article number such as 415, 3a or 18^3a")
      .optional()
      .describe(
        "Return only this article, e.g. 415, 3a or 18^3a for Art. 18 with superscript 3a; omit to get the whole act"
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
  handler: async ({ publisher, year, position, article, offset = 0, maxLength = DEFAULT_TEXT_LENGTH }) => {
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
        return errorResponse(`Failed to fetch the structure of legal act ${eli}.`, structure.error.message);
      }

      const matches = findArticles(structure.data, articleName(article)).slice(0, MAX_ARTICLE_MATCHES);
      if (matches.length === 0) {
        const names = articleNames(structure.data);
        return errorResponse(
          `Article ${article} was not found in legal act ${eli}.`,
          names.length
            ? `The act has ${names.length} articles: ${names.slice(0, 30).join(", ")}${names.length > 30 ? ", ..." : ""}`
            : "The act has no articles; get its whole text instead."
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
          return errorResponse(`Failed to fetch the text of ${subject}.`, fragment.error.message);
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
        return errorResponse(`Failed to fetch the text of ${subject}.`, response.error.message);
      }
      text = actHtmlToText(response.data);
      notice = response.notice;
    }

    if (!text) {
      // The API answers 200 with an empty body for acts that were published only as a PDF.
      return onlyPdf(eli, notice);
    }
    if (offset >= text.length) {
      return errorResponse(
        `Offset ${offset} is beyond the end of the text of ${subject}.`,
        `The text has ${text.length} characters.`
      );
    }

    let end = Math.min(offset + maxLength, text.length);
    if (end < text.length) {
      // Prefer to stop at the end of a line in the second half of the requested range.
      const lineEnd = text.lastIndexOf("\n", end);
      if (lineEnd > offset + maxLength / 2) {
        end = lineEnd;
      }
    }
    const more =
      end < text.length
        ? `\n\n[Truncated: ${text.length - end} more characters. Call again with offset=${end} to continue` +
          `${article ? "" : " or pass article to get a single article"}.]`
        : "";

    return buildToolResponse(
      { ok: true, data: `${text.slice(offset, end).trim()}${more}`, notice },
      `Fetched the text of ${subject} (characters ${offset}-${end} of ${text.length}):`,
      ""
    );
  },
});

/** Lower case without diacritics, so that "podatek" also finds "Podatek" and "zrodla" finds "źródła". */
function fold(text: string): string {
  return text.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/ł/g, "l");
}

export const getActKeywordsTool = defineTool({
  title: "List keywords of legal acts",
  description:
    "List the keywords used to classify Polish legal acts, optionally only those containing a phrase. " +
    "search-acts matches keywords exactly (cywilny finds no acts, kodeks cywilny finds hundreds), so look them up here first.",
  schema: {
    query: z
      .string()
      .min(1)
      .optional()
      .describe("Part of a keyword to look for, ignoring case and Polish diacritics (e.g. podat); omit to list all of about 2,500"),
  },
  outputSchema: listOutput(z.string().describe("Keyword, as accepted by the keywords of search-acts")),
  handler: async ({ query }) => {
    const needle = fold(query ?? "");
    return buildToolResponse(
      await makeSejmRequest<string[]>("/keywords", undefined, { api: "eli" }),
      (matching) => `Found ${matching.length} keywords of legal acts${query ? ` matching "${query}"` : ""}:`,
      "Failed to fetch the keywords of legal acts.",
      (keywords) => keywords.filter((keyword) => fold(keyword).includes(needle))
    );
  },
});
