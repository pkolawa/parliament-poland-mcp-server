import { makeSejmRequest } from "../utils/api.js";
import { htmlToText } from "../utils/html.js";
import { buildToolResponse, defineTool, listOutput, objectOutput, withTerm } from "../utils/tool.js";
import { ProceedingSchema, type Proceeding } from "../types/api.js";
import { limit, offset, term } from "./params.js";

export const getProceedingsTool = defineTool({
  title: "List plenary sittings",
  description:
    "List the plenary sittings of the Sejm (posiedzenia Sejmu: numbered meetings of the whole chamber, " +
    "each lasting one or more days) in a term, with number, title and dates. " +
    "The number is the `proceeding` or `sitting` parameter of get-votings, get-voting, get-transcripts " +
    "and get-mp-votings, and the dates are the days of the sitting.",
  schema: {
    term: term(),
    offset: offset(),
    limit: limit(),
  },
  outputSchema: listOutput(ProceedingSchema),
  handler: ({ term, offset, limit }) =>
    withTerm(term, async (term) =>
      buildToolResponse(
        await makeSejmRequest<Proceeding[]>(`/term${term}/proceedings`, { offset, limit }),
        `Fetched the list of proceedings for term ${term}:`,
        `Failed to fetch the list of proceedings for term ${term}.`
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
        (proceeding) => {
          const result = { ...proceeding };
          for (const field of ["agenda", "currentAffairs", "schedule", "votings"] as const) {
            const html = result[field];
            if (html) {
              result[field] = htmlToText(html);
            }
          }
          return result;
        }
      )
    ),
});
