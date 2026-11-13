import { z } from "zod";
import { makeSejmRequest } from "../utils/api.js";
import { buildToolResponse, defineTool, listOutput, objectOutput, withTerm } from "../utils/tool.js";
import { ClubSchema, type Club } from "../types/api.js";
import { limit, offset, term } from "./params.js";

export const getClubsTool = defineTool({
  title: "List clubs",
  description:
    "List the parliamentary clubs and circles (kluby i koła poselskie: the party groups of MPs in the Sejm) " +
    "with their ID, full name, number of members and contact details. " +
    "The ID (e.g. KO, PiS) is what the `club` field of MPs and votes refers to.",
  schema: {
    term: term(),
    offset: offset(),
    limit: limit(),
  },
  outputSchema: listOutput(ClubSchema),
  handler: ({ term, offset, limit }) =>
    withTerm(term, async (term) =>
      buildToolResponse(
        await makeSejmRequest<Club[]>(`/term${term}/clubs`, { offset, limit }),
        `Fetched the list of clubs for term ${term}:`,
        `Failed to fetch the list of clubs for term ${term}.`
      )
    ),
});

export const getClubTool = defineTool({
  title: "Get a club",
  description:
    "Get details of one parliamentary club or circle (klub, koło): full name, number of members and contact details.",
  schema: {
    term: term(),
    id: z
      .string()
      .regex(/^[A-Za-z0-9][A-Za-z0-9._-]*$/, "Expected a club ID such as KO")
      .describe("ID of the club, e.g. KO or PiS: the `id` field from get-clubs"),
  },
  outputSchema: objectOutput(ClubSchema),
  handler: ({ term, id }) =>
    withTerm(term, async (term) =>
      buildToolResponse(
        await makeSejmRequest<Club>(`/term${term}/clubs/${encodeURIComponent(id)}`),
        `Fetched details for club ${id} in term ${term}:`,
        `Failed to fetch details for club ${id} in term ${term}.`
      )
    ),
});
