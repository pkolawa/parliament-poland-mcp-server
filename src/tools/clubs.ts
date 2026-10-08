import { z } from "zod";
import { makeSejmRequest } from "../utils/api.js";
import type { Club } from "../types/api.js";

export const getClubsTool = {
  description: "Get a list of clubs for a given term",
  schema: {
    term: z.number().int().positive().describe("Term of the Sejm"),
    offset: z.number().int().positive().optional().describe("Offset for pagination"),
    limit: z.number().int().positive().optional().describe("Limit for pagination"),
  },
  handler: async (args: { term: number, offset?: number, limit?: number }) => {
    const { term, offset, limit } = args;
    const clubs = await makeSejmRequest<Club[]>(
      `/term${term}/clubs`,
      { offset, limit },
    );

    if (!clubs.ok) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Failed to fetch the list of clubs for term ${term}.\n\nError: ${clubs.error.message}`,
          },
        ],
        isError: true,
      };
    }

    return {
      content: [
        {
          type: "text" as const,
          text: `Fetched the list of clubs for term ${term}:\n\n${JSON.stringify(clubs.data, null, 2)}`,
        },
      ],
    };
  },
};

export const getClubTool = {
  description: "Get detailed information about a specific club",
  schema: {
    term: z.number().int().positive().describe("Term of the Sejm"),
    id: z.string().describe("ID of the club (e.g., 'KO', 'PIS')"),
  },
  handler: async (args: { term: number; id: string }) => {
    const { term, id } = args;
    const club = await makeSejmRequest<Club>(
      `/term${term}/clubs/${id}`
    );

    if (!club.ok) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Failed to fetch details for club ${id} in term ${term}.\n\nError: ${club.error.message}`,
          },
        ],
        isError: true,
      };
    }

    return {
      content: [
        {
          type: "text" as const,
          text: `Fetched details for club ${id} in term ${term}:\n\n${JSON.stringify(club.data, null, 2)}`,
        },
      ],
    };
  },
};