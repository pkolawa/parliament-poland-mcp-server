import { z } from "zod";
import { makeSejmRequest } from "../utils/api.js";
import type { MpVote, VotingStat } from "../types/api.js";

export const getMpVotingStatsTool = {
  description: "Get voting attendance statistics of an MP for each sitting day",
  schema: {
    term: z.number().int().positive().describe("Term of the Sejm"),
    id: z.number().int().positive().describe("ID of the MP"),
  },
  handler: async (args: { term: number; id: number }) => {
    const { term, id } = args;
    const stats = await makeSejmRequest<VotingStat[]>(
      `/term${term}/MP/${id}/votings/stats`
    );

    if (!stats.ok) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Failed to fetch voting statistics for the MP with ID ${id} in term ${term}.\n\nError: ${stats.error.message}`,
          },
        ],
        isError: true,
      };
    }

    return {
      content: [
        {
          type: "text" as const,
          text: `${stats.notice ?? ""}Fetched voting statistics for the MP with ID ${id} in term ${term}:\n\n${JSON.stringify(stats.data, null, 2)}`,
        },
      ],
    };
  },
};

export const getMpVotingsTool = {
  description: "Get how an MP voted on a given sitting day",
  schema: {
    term: z.number().int().positive().describe("Term of the Sejm"),
    id: z.number().int().positive().describe("ID of the MP"),
    sitting: z.number().int().positive().describe("Sejm sitting number"),
    date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Expected a date in YYYY-MM-DD format")
      .describe("Day of the sitting in YYYY-MM-DD format"),
  },
  handler: async (args: { term: number; id: number; sitting: number; date: string }) => {
    const { term, id, sitting, date } = args;
    const votes = await makeSejmRequest<MpVote[]>(
      `/term${term}/MP/${id}/votings/${sitting}/${date}`
    );

    if (!votes.ok) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Failed to fetch the votes of the MP with ID ${id} on ${date} (sitting ${sitting}, term ${term}).\n\nError: ${votes.error.message}`,
          },
        ],
        isError: true,
      };
    }

    return {
      content: [
        {
          type: "text" as const,
          text: `${votes.notice ?? ""}Fetched the votes of the MP with ID ${id} on ${date} (sitting ${sitting}, term ${term}):\n\n${JSON.stringify(votes.data, null, 2)}`,
        },
      ],
    };
  },
};
