import { z } from "zod";
import { makeSejmRequest } from "../utils/api.js";

export const getInterpellationsTool = {
  description: "Get a list of interpellations for a given term.",
  schema: {
    term: z.number().int().positive().describe("Term of the Sejm"),
    offset: z.number().int().positive().optional().describe("Offset for pagination"),
    limit: z.number().int().positive().optional().describe("Limit for pagination"),
    dateFrom: z.string().optional().describe("Search interpellations from a specific date."),
    dateTo: z.string().optional().describe("Search interpellations up to a specific date."),
    title: z.string().optional().describe("Search for a phrase in the title."),
    number: z.number().int().positive().optional().describe("Search by interpellation number."),
    mp: z.number().int().positive().optional().describe("Search by MP's ID."),
    club: z.string().optional().describe("Search by club symbol."),
    status: z.string().optional().describe("Search by status (e.g., ANSWERED, UNANSWERED)."),
    sort_by: z.string().optional().describe("Sort by a specific field."),
  },
  handler: async (args: { term: number, offset?: number, limit?: number, dateFrom?: string, dateTo?: string, title?: string, number?: number, mp?: number, club?: string, status?: string, sort_by?: string }) => {
    const { term, offset, limit, dateFrom, dateTo, title, number, mp, club, status, sort_by } = args;
    const interpellations = await makeSejmRequest<any[]>(
      `/term${term}/interpellations`,
      { offset, limit, dateFrom, dateTo, title, number, mp, club, status, sort_by },
    );

    if (!interpellations) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Failed to fetch the list of interpellations for term ${term}.`,
          },
        ],
      };
    }

    return {
      content: [
        {
          type: "text" as const,
          text: `Fetched the list of interpellations for term ${term}:\n\n${JSON.stringify(interpellations, null, 2)}`,
        },
      ],
    };
  },
};
