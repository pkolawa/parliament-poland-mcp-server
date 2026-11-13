import { makeSejmRequest } from "../utils/api.js";
import { htmlToText } from "../utils/html.js";
import {
  buildToolResponse,
  defineTool,
  describePage,
  objectOutput,
  pagedListOutput,
  paginate,
  withTerm,
} from "../utils/tool.js";
import { ProceedingSchema, type Proceeding } from "../types/api.js";
import { limitOrAll, offset, sitting, term } from "./params.js";

const HTML_FIELDS = ["agenda", "currentAffairs", "schedule", "votings"] as const;

/** Converts the HTML fields of a sitting (agenda, schedules) to plain text. */
function withTextFields(proceeding: Proceeding): Proceeding {
  const result = { ...proceeding };
  for (const field of HTML_FIELDS) {
    const html = result[field];
    if (html) {
      result[field] = htmlToText(html);
    }
  }
  return result;
}

/** Leaves out the HTML fields, which make the list of sittings about 700 KB. */
function withoutHtmlFields(proceeding: Proceeding): Proceeding {
  const summary = { ...proceeding };
  for (const field of HTML_FIELDS) {
    delete summary[field];
  }
  return summary;
}

export const getProceedingsTool = defineTool({
  title: "List plenary sittings",
  description:
    "List the plenary sittings of the Sejm (posiedzenia Sejmu: numbered meetings of the whole chamber, " +
    "each lasting one or more days) in a term, with number, title and dates. Planned sittings that have no number " +
    "yet have number 0. The number is the `proceeding` or `sitting` parameter of get-proceeding, get-votings, " +
    "get-voting, get-transcripts and get-mp-votings, and the dates are the days of the sitting. " +
    "Agendas are returned by get-proceeding.",
  schema: {
    term: term(),
    offset: offset(),
    limit: limitOrAll(),
  },
  outputSchema: pagedListOutput(ProceedingSchema),
  // The API documents no offset or limit for this list, so it is paginated here.
  handler: ({ term, offset, limit }) =>
    withTerm(term, async (term) =>
      buildToolResponse(
        await makeSejmRequest<Proceeding[]>(`/term${term}/proceedings`),
        (page) => `Fetched ${describePage(page, `plenary sittings of term ${term}`)}:`,
        `Failed to fetch the list of proceedings for term ${term}.`,
        (proceedings: Proceeding[]) => paginate(proceedings.map(withoutHtmlFields), offset, limit)
      )
    ),
});

export const getProceedingTool = defineTool({
  title: "Get a plenary sitting",
  description:
    "Get one plenary sitting of the Sejm (posiedzenie Sejmu) with its number, dates and agenda " +
    "(porządek dzienny) as plain text.",
  schema: {
    term: term(),
    proceeding: sitting(),
  },
  outputSchema: objectOutput(ProceedingSchema),
  handler: ({ term, proceeding }) =>
    withTerm(term, async (term) =>
      buildToolResponse(
        await makeSejmRequest<Proceeding>(`/term${term}/proceedings/${proceeding}`),
        `Fetched sitting ${proceeding} for term ${term}:`,
        `Failed to fetch sitting ${proceeding} for term ${term}.`,
        withTextFields
      )
    ),
});

export const getCurrentProceedingTool = defineTool({
  title: "Get the current plenary sitting",
  description:
    "Get the current plenary sitting of the Sejm, or the next one if none is in progress, with its number, dates, " +
    "agenda (porządek dzienny), schedule, voting schedule and current affairs, as plain text.",
  schema: {
    term: term(),
  },
  outputSchema: objectOutput(ProceedingSchema),
  handler: ({ term }) =>
    withTerm(term, async (term) =>
      buildToolResponse(
        await makeSejmRequest<Proceeding>(`/term${term}/proceedings/current`),
        `Fetched the current sitting for term ${term}:`,
        `Failed to fetch the current sitting for term ${term}.`,
        withTextFields
      )
    ),
});
