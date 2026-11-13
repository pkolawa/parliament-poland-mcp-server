import { z } from "zod";
import { makeSejmRequest } from "../utils/api.js";
import { htmlToText } from "../utils/html.js";
import { buildToolResponse, defineTool, listOutput, objectOutput, withTerm } from "../utils/tool.js";
import {
  CommitteeSchema,
  CommitteeSittingSchema,
  type Committee,
  type CommitteeSitting,
} from "../types/api.js";
import { committeeCode, date, limit, offset, term } from "./params.js";

export const getCommitteesTool = defineTool({
  title: "List committees",
  description:
    "List the committees of the Sejm (komisje sejmowe: standing, extraordinary and investigative committees that " +
    "examine bills and oversee the government) with their code, name, type and scope. " +
    "The code (e.g. ASW) is the input of get-committee and get-committee-sittings.",
  schema: {
    term: term(),
    offset: offset(),
    limit: limit(),
  },
  outputSchema: listOutput(CommitteeSchema),
  handler: ({ term, offset, limit }) =>
    withTerm(term, async (term) =>
      buildToolResponse(
        await makeSejmRequest<Committee[]>(`/term${term}/committees`, { offset, limit }),
        `Fetched the list of committees for term ${term}:`,
        `Failed to fetch the list of committees for term ${term}.`
      )
    ),
});

export const getCommitteeTool = defineTool({
  title: "Get a committee",
  description:
    "Get details of one Sejm committee (komisja): name, type, scope of work, appointment date, " +
    "members with their club and function (e.g. przewodniczący = chair), and codes of its subcommittees.",
  schema: {
    term: term(),
    id: committeeCode(),
  },
  outputSchema: objectOutput(CommitteeSchema),
  handler: ({ term, id }) =>
    withTerm(term, async (term) =>
      buildToolResponse(
        await makeSejmRequest<Committee>(`/term${term}/committees/${id}`),
        `Fetched details for committee ${id} in term ${term}:`,
        `Failed to fetch details for committee ${id} in term ${term}.`
      )
    ),
});

export const getCommitteeSittingsTool = defineTool({
  title: "List committee sittings",
  description:
    "List the sittings (posiedzenia) of one committee in a term, oldest first, with date, time, room, " +
    "status (PLANNED, FINISHED, CANCELLED) and agenda as plain text. Narrow the list with dateFrom and dateTo; " +
    "get-committee-sitting returns one sitting with its video links.",
  schema: {
    term: term(),
    code: committeeCode(),
    dateFrom: date("Earliest sitting date").optional(),
    dateTo: date("Latest sitting date").optional(),
    cancelled: z.boolean().optional().describe("Also include cancelled sittings; defaults to false"),
    offset: offset().describe("Number of sittings to skip after the date filter, for pagination; defaults to 0"),
    limit: z
      .number()
      .int()
      .positive()
      .optional()
      .describe("Maximum number of sittings to return after the date filter; all by default"),
  },
  outputSchema: listOutput(CommitteeSittingSchema),
  handler: ({ term, code, dateFrom, dateTo, cancelled, offset = 0, limit }) =>
    withTerm(term, async (term) =>
      buildToolResponse(
        await makeSejmRequest<CommitteeSitting[]>(`/term${term}/committees/${code}/sittings`, { cancelled }),
        (result) => `Fetched ${result.length} sittings of committee ${code} in term ${term}:`,
        `Failed to fetch the sittings of committee ${code} in term ${term}.`,
        // The API has no date filter or pagination and returns every sitting of the term with its
        // video links, which is far too much for the context; videos are in get-committee-sitting.
        (sittings) =>
          sittings
            .filter((s) => (!dateFrom || (s.date ?? "") >= dateFrom) && (!dateTo || (s.date ?? "") <= dateTo))
            .slice(offset, limit === undefined ? undefined : offset + limit)
            .map(({ video: _video, agenda, ...sitting }) => ({
              ...sitting,
              ...(agenda ? { agenda: htmlToText(agenda) } : {}),
            }))
      )
    ),
});

export const getCommitteeSittingTool = defineTool({
  title: "Get a committee sitting",
  description:
    "Get one sitting of a committee: date, time, room, status, agenda as plain text and links to the video recordings.",
  schema: {
    term: term(),
    code: committeeCode(),
    num: z.number().int().positive().describe("Number of the committee sitting: the `num` field from get-committee-sittings"),
  },
  outputSchema: objectOutput(CommitteeSittingSchema),
  handler: ({ term, code, num }) =>
    withTerm(term, async (term) =>
      buildToolResponse(
        await makeSejmRequest<CommitteeSitting>(`/term${term}/committees/${code}/sittings/${num}`),
        `Fetched sitting ${num} of committee ${code} in term ${term}:`,
        `Failed to fetch sitting ${num} of committee ${code} in term ${term}.`,
        ({ agenda, ...details }) => (agenda ? { ...details, agenda: htmlToText(agenda) } : details)
      )
    ),
});
