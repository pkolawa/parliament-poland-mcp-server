import { z } from "zod";
import { makeSejmRequest } from "../utils/api.js";
import { htmlToText } from "../utils/html.js";
import type { Interpellation } from "../types/api.js";

export const getInterpellationsTool = {
  description: "Get a list of interpellations for a given term",
  schema: {
    term: z.number().int().positive().describe("Term of the Sejm"),
    offset: z.number().int().nonnegative().optional().describe("Offset for pagination"),
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
    const interpellations = await makeSejmRequest<Interpellation[]>(
      `/term${term}/interpellations`,
      { offset, limit, dateFrom, dateTo, title, number, mp, club, status, sort_by },
    );

    if (!interpellations.ok) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Failed to fetch the list of interpellations for term ${term}.\n\nError: ${interpellations.error.message}`,
          },
        ],
        isError: true,
      };
    }

    return {
      content: [
        {
          type: "text" as const,
          text: `${interpellations.notice ?? ""}Fetched the list of interpellations for term ${term}:\n\n${JSON.stringify(interpellations.data, null, 2)}`,
        },
      ],
    };
  },
};

export const getInterpellationTool = {
  description: "Get detailed information about a specific interpellation",
  schema: {
    term: z.number().int().positive().describe("Term of the Sejm"),
    id: z.number().int().positive().describe("ID of the interpellation"),
  },
  handler: async (args: { term: number; id: number }) => {
    const { term, id } = args;
    const interpellation = await makeSejmRequest<Interpellation>(
      `/term${term}/interpellations/${id}`
    );

    if (!interpellation.ok) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Failed to fetch details for interpellation ${id} in term ${term}.\n\nError: ${interpellation.error.message}`,
          },
        ],
        isError: true,
      };
    }

    return {
      content: [
        {
          type: "text" as const,
          text: `${interpellation.notice ?? ""}Fetched details for interpellation ${id} in term ${term}:\n\n${JSON.stringify(interpellation.data, null, 2)}`,
        },
      ],
    };
  },
};

export const getInterpellationTextTool = {
  description: "Get the text of an interpellation or of a reply to it",
  schema: {
    term: z.number().int().positive().describe("Term of the Sejm"),
    num: z.number().int().positive().describe("Number of the interpellation"),
    replyKey: z
      .string()
      .regex(/^[A-Za-z0-9]+$/, "Expected a reply key such as CZLJNC")
      .optional()
      .describe("Key of a reply (replies[].key from get-interpellation); omit to get the interpellation itself. A reply with onlyAttachment=true has its content only in the attached PDF"),
  },
  handler: async (args: { term: number, num: number, replyKey?: string }) => {
    const { term, num, replyKey } = args;
    const subject = replyKey ? `reply ${replyKey} to interpellation ${num}` : `interpellation ${num}`;
    const body = await makeSejmRequest<string>(
      `/term${term}/interpellations/${num}${replyKey ? `/reply/${replyKey}` : ""}/body`,
      undefined,
      { format: "html" },
    );

    if (!body.ok) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Failed to fetch the text of ${subject} in term ${term}.\n\nError: ${body.error.message}`,
          },
        ],
        isError: true,
      };
    }

    return {
      content: [
        {
          type: "text" as const,
          text: `${body.notice ?? ""}Fetched the text of ${subject} in term ${term}:\n\n${htmlToText(body.data)}`,
        },
      ],
    };
  },
};
