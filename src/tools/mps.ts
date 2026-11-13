import { makeSejmRequest } from "../utils/api.js";
import { buildToolResponse, defineTool, listOutput, objectOutput, withTerm } from "../utils/tool.js";
import { MpSchema, type Mp } from "../types/api.js";
import { limit, mpId, offset, term } from "./params.js";

export const getMpTool = defineTool({
  title: "Get an MP",
  description:
    "Get details of one member of the Sejm (poseł, MP): name, club, electoral district and voivodeship, " +
    "votes received, birth date and place, education, profession, e-mail, and whether the mandate is still held.",
  schema: {
    term: term(),
    id: mpId(),
  },
  outputSchema: objectOutput(MpSchema),
  handler: ({ term, id }) =>
    withTerm(term, async (term) =>
      buildToolResponse(
        await makeSejmRequest<Mp>(`/term${term}/MP/${id}`),
        `Fetched information about the MP with ID ${id} in term ${term}:`,
        `Failed to fetch information about the MP with ID ${id} in term ${term}.`
      )
    ),
});

export const getMpsTool = defineTool({
  title: "List MPs",
  description:
    "List members of the Sejm (posłowie, MPs) in a term with their ID, name, club (klub), electoral district and active flag. " +
    "MPs who left during the term are included with active=false. " +
    "The ID is the input of get-member, get-mp-voting-stats and get-mp-votings.",
  schema: {
    term: term(),
    offset: offset(),
    limit: limit(),
  },
  outputSchema: listOutput(MpSchema),
  handler: ({ term, offset, limit }) =>
    withTerm(term, async (term) =>
      buildToolResponse(
        await makeSejmRequest<Mp[]>(`/term${term}/MP`, { offset, limit }),
        `Fetched the list of MPs for term ${term}:`,
        `Failed to fetch the list of MPs for term ${term}`
      )
    ),
});
