import { z } from "zod";
import { makeSejmRequest } from "../utils/api.js";
import { buildToolResponse, defineTool, listOutput, objectOutput, withTerm } from "../utils/tool.js";
import { VotingResultSchema, VotingSchema, type Voting, type VotingDetails } from "../types/api.js";
import { date, limit, offset, sitting, term, title } from "./params.js";

export const getVotingsTool = defineTool({
  title: "List votings of a sitting",
  description:
    "List all votings (głosowania) held during one plenary sitting, with voting number, day, time, title, topic, " +
    "kind, required majority and the number of YES, NO and ABSTAIN votes. " +
    "Get the breakdown by club with get-voting; find votings across sittings with search-votings.",
  schema: {
    term: term(),
    proceeding: sitting(),
    offset: offset(),
    limit: limit(),
  },
  outputSchema: listOutput(VotingSchema),
  handler: ({ term, proceeding, offset, limit }) =>
    withTerm(term, async (term) =>
      buildToolResponse(
        await makeSejmRequest<Voting[]>(`/term${term}/votings/${proceeding}`, { offset, limit }),
        `Fetched the list of votings for term ${term}:`,
        `Failed to fetch the list of votings for term ${term}.`
      )
    ),
});

export const getVotingTool = defineTool({
  title: "Get a voting",
  description:
    "Get the result of one voting (głosowanie) of the Sejm: title, topic, kind, required majority, totals of YES, NO " +
    "and ABSTAIN votes, and the number of votes of each kind per club (votesByClub). " +
    "Optionally also how each MP voted.",
  schema: {
    term: term(),
    sitting: sitting(),
    votingNumber: z
      .number()
      .int()
      .positive()
      .describe("Number of the voting within the sitting: the `votingNumber` field from get-votings or search-votings"),
    includeVotes: z
      .boolean()
      .optional()
      .describe("Also return how each MP voted (about 460 entries); defaults to false"),
    club: z
      .string()
      .min(1)
      .optional()
      .describe("Return the individual votes of this club only, e.g. KO or PiS (the `id` from get-clubs); implies includeVotes"),
  },
  outputSchema: objectOutput(VotingResultSchema),
  handler: ({ term, sitting, votingNumber, includeVotes, club }) =>
    withTerm(term, async (term) =>
      buildToolResponse(
        await makeSejmRequest<VotingDetails>(`/term${term}/votings/${sitting}/${votingNumber}`),
        `Fetched voting ${votingNumber} from sitting ${sitting} in term ${term}:`,
        `Failed to fetch voting ${votingNumber} from sitting ${sitting} in term ${term}.`,
        ({ votes, ...summary }) => {
          const all = votes ?? [];
          const votesByClub: Record<string, Record<string, number>> = {};
          for (const { club: mpClub, vote } of all) {
            const byVote = (votesByClub[mpClub ?? ""] ??= {});
            byVote[vote ?? ""] = (byVote[vote ?? ""] ?? 0) + 1;
          }
          return {
            ...summary,
            votesByClub,
            ...(includeVotes || club
              ? { votes: club ? all.filter((v) => v.club?.toLowerCase() === club.toLowerCase()) : all }
              : {}),
          };
        }
      )
    ),
});

export const searchVotingsTool = defineTool({
  title: "Search votings",
  description:
    "Search the votings (głosowania) of a term by a phrase in the title, by sitting and by date range. " +
    "Returns the same fields as get-votings; get the breakdown by club with get-voting.",
  schema: {
    term: term(),
    title: title("voting"),
    proceeding: sitting().optional(),
    dateFrom: date("Earliest voting date").optional(),
    dateTo: date("Latest voting date").optional(),
    offset: offset(),
    limit: limit(),
  },
  outputSchema: listOutput(VotingSchema),
  handler: ({ term, title, proceeding, dateFrom, dateTo, offset, limit }) =>
    withTerm(term, async (term) =>
      buildToolResponse(
        await makeSejmRequest<Voting[]>(`/term${term}/votings/search`, {
          title,
          proceeding,
          dateFrom,
          dateTo,
          offset,
          limit,
        }),
        (votings) => `Found ${votings.length} votings in term ${term}:`,
        `Failed to search votings in term ${term}.`
      )
    ),
});
