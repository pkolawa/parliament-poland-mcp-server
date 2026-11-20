import { makeSejmRequest } from "../utils/api.js";
import { buildToolResponse, defineTool, listOutput, withTerm } from "../utils/tool.js";
import { MpVoteSchema, VotingStatSchema, type MpVote, type VotingStat } from "../types/api.js";
import { mpId, sitting, sittingDate, term } from "./params.js";

export const getMpVotingStatsTool = defineTool({
  title: "Get an MP's voting attendance",
  description:
    "Get an MP's attendance in votings for every sitting day of a term: how many votings were held, " +
    "how many the MP took part in or missed, and whether the absence was excused. " +
    "Use a sitting number and date from here with get-mp-votings to see the votes themselves.",
  schema: {
    term: term(),
    id: mpId(),
  },
  outputSchema: listOutput(VotingStatSchema),
  handler: ({ term, id }) =>
    withTerm(term, async (term) =>
      buildToolResponse(
        await makeSejmRequest<VotingStat[]>(`/term${term}/MP/${id}/votings/stats`),
        `Fetched voting statistics for the MP with ID ${id} in term ${term}:`,
        `Failed to fetch voting statistics for the MP with ID ${id} in term ${term}.`
      )
    ),
});

export const getMpVotingsTool = defineTool({
  title: "Get an MP's votes on a day",
  description:
    "Get how an MP voted (YES, NO, ABSTAIN, ABSENT) in every voting held on one day of a plenary sitting, " +
    "with the title and topic of each voting. Days on which votings were held are listed by get-mp-voting-stats.",
  schema: {
    term: term(),
    id: mpId(),
    sitting: sitting(),
    date: sittingDate(),
  },
  outputSchema: listOutput(MpVoteSchema),
  handler: ({ term, id, sitting, date }) =>
    withTerm(term, async (term) =>
      buildToolResponse(
        await makeSejmRequest<MpVote[]>(`/term${term}/MP/${id}/votings/${sitting}/${date}`),
        `Fetched the votes of the MP with ID ${id} on ${date} (sitting ${sitting}, term ${term}):`,
        `Failed to fetch the votes of the MP with ID ${id} on ${date} (sitting ${sitting}, term ${term}).`
      )
    ),
});
