import { z } from "zod";
import { makeSejmRequest } from "../utils/api.js";
import type { Voting, VotingDetails } from "../types/api.js";

const DATE = /^\d{4}-\d{2}-\d{2}$/;

export const getVotingsTool = {
  description: "Get a list of votings for a given term",
  schema: {
    term: z.number().int().positive().describe("Term of the Sejm"),
    proceeding: z.number().int().positive().describe("Sejm sitting number"),
    offset: z.number().int().nonnegative().optional().describe("Offset for pagination"),
    limit: z.number().int().positive().optional().describe("Limit for pagination"),
  },
  handler: async (args: { term: number, proceeding: number, offset?: number, limit?: number }) => {
    const { term, proceeding, offset, limit } = args;
    const votings = await makeSejmRequest<Voting[]>(
      `/term${term}/votings/${proceeding}`,
      { offset, limit },
    );

    if (!votings.ok) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Failed to fetch the list of votings for term ${term}.\n\nError: ${votings.error.message}`,
          },
        ],
        isError: true,
      };
    }

    return {
      content: [
        {
          type: "text" as const,
          text: `${votings.notice ?? ""}Fetched the list of votings for term ${term}:\n\n${JSON.stringify(votings.data, null, 2)}`,
        },
      ],
    };
  },
};

export const getVotingTool = {
  description: "Get the results of a single voting with a breakdown by club",
  schema: {
    term: z.number().int().positive().describe("Term of the Sejm"),
    sitting: z.number().int().positive().describe("Sejm sitting number"),
    votingNumber: z.number().int().positive().describe("Number of the voting within the sitting"),
    includeVotes: z.boolean().optional().describe("Also return how each MP voted (about 460 entries); defaults to false"),
    club: z.string().optional().describe("Club symbol (e.g. KO, PiS) to return only that club's individual votes; implies includeVotes"),
  },
  handler: async (args: { term: number, sitting: number, votingNumber: number, includeVotes?: boolean, club?: string }) => {
    const { term, sitting, votingNumber, includeVotes, club } = args;
    const voting = await makeSejmRequest<VotingDetails>(
      `/term${term}/votings/${sitting}/${votingNumber}`
    );

    if (!voting.ok) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Failed to fetch voting ${votingNumber} from sitting ${sitting} in term ${term}.\n\nError: ${voting.error.message}`,
          },
        ],
        isError: true,
      };
    }

    const { votes, ...summary } = voting.data;
    const votesByClub: Record<string, Record<string, number>> = {};
    for (const { club: mpClub, vote } of votes) {
      votesByClub[mpClub] ??= {};
      votesByClub[mpClub][vote] = (votesByClub[mpClub][vote] ?? 0) + 1;
    }
    const result = {
      ...summary,
      votesByClub,
      ...(includeVotes || club
        ? { votes: club ? votes.filter((v) => v.club.toLowerCase() === club.toLowerCase()) : votes }
        : {}),
    };

    return {
      content: [
        {
          type: "text" as const,
          text: `${voting.notice ?? ""}Fetched voting ${votingNumber} from sitting ${sitting} in term ${term}:\n\n${JSON.stringify(result, null, 2)}`,
        },
      ],
    };
  },
};

export const searchVotingsTool = {
  description: "Search for votings in a given term",
  schema: {
    term: z.number().int().positive().describe("Term of the Sejm"),
    title: z.string().optional().describe("Phrase to search for in the voting title, in Polish (e.g. energii elektrycznej)"),
    proceeding: z.number().int().positive().optional().describe("Sejm sitting number"),
    dateFrom: z.string().regex(DATE, "Expected a date in YYYY-MM-DD format").optional().describe("Earliest voting date in YYYY-MM-DD format"),
    dateTo: z.string().regex(DATE, "Expected a date in YYYY-MM-DD format").optional().describe("Latest voting date in YYYY-MM-DD format"),
    offset: z.number().int().nonnegative().optional().describe("Offset for pagination"),
    limit: z.number().int().positive().optional().describe("Limit for pagination"),
  },
  handler: async (args: { term: number, title?: string, proceeding?: number, dateFrom?: string, dateTo?: string, offset?: number, limit?: number }) => {
    const { term, title, proceeding, dateFrom, dateTo, offset, limit } = args;
    const votings = await makeSejmRequest<Voting[]>(
      `/term${term}/votings/search`,
      { title, proceeding, dateFrom, dateTo, offset, limit },
    );

    if (!votings.ok) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Failed to search votings in term ${term}.\n\nError: ${votings.error.message}`,
          },
        ],
        isError: true,
      };
    }

    return {
      content: [
        {
          type: "text" as const,
          text: `${votings.notice ?? ""}Found ${votings.data.length} votings in term ${term}:\n\n${JSON.stringify(votings.data, null, 2)}`,
        },
      ],
    };
  },
};
