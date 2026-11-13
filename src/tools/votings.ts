import { z } from "zod";
import { makeSejmRequest } from "../utils/api.js";
import { wordMatcher } from "../utils/text.js";
import {
  buildToolResponse,
  defineTool,
  describeFilters,
  describePage,
  listOutput,
  objectOutput,
  pagedListOutput,
  paginate,
  withTerm,
} from "../utils/tool.js";
import { VotingResultSchema, VotingSchema, type Voting, type VotingDetails } from "../types/api.js";
import { date, limit, offset, sitting, term, title } from "./params.js";

/** Votings returned by get-votings per page unless `limit` says otherwise. */
export const VOTING_PAGE_SIZE = 50;

/** Leaves out the link to the PDF with the results and the term, which the caller passed. */
function summarizeVoting({ links: _links, term: _term, ...voting }: Voting): Voting {
  return voting;
}

export const getVotingsTool = defineTool({
  title: "List votings of a sitting",
  description:
    "List the votings (głosowania) held during one plenary sitting (posiedzenie), in order, with voting number, " +
    "date and time, title, topic, kind, required majority and the number of YES, NO and ABSTAIN votes. " +
    `A sitting often has over a hundred votings, so they are returned ${VOTING_PAGE_SIZE} per page; ` +
    "narrow them to one day of the sitting with date, or by subject with title. " +
    "Get the breakdown by club with get-voting; find votings across sittings with search-votings.",
  schema: {
    term: term(),
    proceeding: sitting(),
    date: date("Only votings held on this day of the sitting (one of its `dates` in get-proceedings)").optional(),
    title: z
      .string()
      .min(1)
      .optional()
      .describe(
        "Only votings whose title, topic or description contains all these words, in Polish, e.g. budżet or " +
          "poprawka; case and diacritics are ignored, and a stem such as podatk also matches podatku and podatkowy"
      ),
    offset: offset(),
    limit: limit(VOTING_PAGE_SIZE),
  },
  outputSchema: pagedListOutput(VotingSchema),
  handler: ({ term, proceeding, date, title, offset, limit = VOTING_PAGE_SIZE }) =>
    withTerm(term, async (term) => {
      // The API returns every voting of the sitting (about 600 bytes each) and has no filters or pagination.
      const result = await makeSejmRequest<Voting[]>(`/term${term}/votings/${proceeding}`);
      const titleMatches = title ? wordMatcher(title) : undefined;
      const noun = `votings of sitting ${proceeding} in term ${term}${describeFilters({ date, title })}`;
      return buildToolResponse(
        result,
        (page) => {
          const days = result.ok ? [...new Set(result.data.map((v) => v.date?.slice(0, 10)).filter(Boolean))] : [];
          const hint = page.total === 0 && date && days.length ? ` (days with votings: ${days.join(", ")})` : "";
          return `Fetched ${describePage(page, noun)}${hint}:`;
        },
        `Failed to fetch the list of votings for term ${term}.`,
        (votings: Voting[]) =>
          paginate(
            votings
              .filter(
                (v) =>
                  (!date || v.date?.startsWith(date)) &&
                  (!titleMatches || titleMatches(v.title, v.topic, v.description))
              )
              .map(summarizeVoting),
            offset,
            limit
          )
      );
    }),
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
        `Failed to search votings in term ${term}.`,
        (votings) => votings.map(summarizeVoting)
      )
    ),
});
