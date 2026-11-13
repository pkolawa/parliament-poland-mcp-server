import { z } from "zod";
import { makeSejmRequest } from "../utils/api.js";
import { htmlToText } from "../utils/html.js";
import type { Committee, CommitteeSitting } from "../types/api.js";

const COMMITTEE_CODE = z
  .string()
  .regex(/^[A-Za-z0-9]+$/, "Expected a committee code such as ASW")
  .describe("Code of the committee (e.g. ASW, KFP), as returned by get-committees");
const DATE = /^\d{4}-\d{2}-\d{2}$/;

export const getCommitteesTool = {
  description: "Get a list of committees for a given term",
  schema: {
    term: z.number().int().positive().describe("Term of the Sejm"),
    offset: z.number().int().nonnegative().optional().describe("Offset for pagination"),
    limit: z.number().int().positive().optional().describe("Limit for pagination"),
  },
  handler: async (args: { term: number, offset?: number, limit?: number }) => {
    const { term, offset, limit } = args;
    const committees = await makeSejmRequest<Committee[]>(
      `/term${term}/committees`,
      { offset, limit },
    );

    if (!committees.ok) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Failed to fetch the list of committees for term ${term}.\n\nError: ${committees.error.message}`,
          },
        ],
        isError: true,
      };
    }

    return {
      content: [
        {
          type: "text" as const,
          text: `${committees.notice ?? ""}Fetched the list of committees for term ${term}:\n\n${JSON.stringify(committees.data, null, 2)}`,
        },
      ],
    };
  },
};

export const getCommitteeTool = {
  description: "Get detailed information about a specific committee",
  schema: {
    term: z.number().int().positive().describe("Term of the Sejm"),
    id: z.string().describe("ID of the committee (e.g., 'KFP', 'ESM')"),
  },
  handler: async (args: { term: number; id: string }) => {
    const { term, id } = args;
    const committee = await makeSejmRequest<Committee>(
      `/term${term}/committees/${id}`
    );

    if (!committee.ok) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Failed to fetch details for committee ${id} in term ${term}.\n\nError: ${committee.error.message}`,
          },
        ],
        isError: true,
      };
    }

    return {
      content: [
        {
          type: "text" as const,
          text: `${committee.notice ?? ""}Fetched details for committee ${id} in term ${term}:\n\n${JSON.stringify(committee.data, null, 2)}`,
        },
      ],
    };
  },
};

export const getCommitteeSittingsTool = {
  description: "Get a list of sittings of a committee",
  schema: {
    term: z.number().int().positive().describe("Term of the Sejm"),
    code: COMMITTEE_CODE,
    dateFrom: z.string().regex(DATE, "Expected a date in YYYY-MM-DD format").optional().describe("Earliest sitting date in YYYY-MM-DD format"),
    dateTo: z.string().regex(DATE, "Expected a date in YYYY-MM-DD format").optional().describe("Latest sitting date in YYYY-MM-DD format"),
    cancelled: z.boolean().optional().describe("Also include cancelled sittings"),
    offset: z.number().int().nonnegative().optional().describe("Offset for pagination, applied after the date filter"),
    limit: z.number().int().positive().optional().describe("Limit for pagination, applied after the date filter"),
  },
  handler: async (args: { term: number, code: string, dateFrom?: string, dateTo?: string, cancelled?: boolean, offset?: number, limit?: number }) => {
    const { term, code, dateFrom, dateTo, cancelled, offset = 0, limit } = args;
    const sittings = await makeSejmRequest<CommitteeSitting[]>(
      `/term${term}/committees/${code}/sittings`,
      { cancelled },
    );

    if (!sittings.ok) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Failed to fetch the sittings of committee ${code} in term ${term}.\n\nError: ${sittings.error.message}`,
          },
        ],
        isError: true,
      };
    }

    // The API has no date filter or pagination and returns every sitting of the term with its
    // video links, which is far too much for the context; videos are in get-committee-sitting.
    const result = sittings.data
      .filter((s) => (!dateFrom || s.date >= dateFrom) && (!dateTo || s.date <= dateTo))
      .slice(offset, limit === undefined ? undefined : offset + limit)
      .map(({ video: _video, agenda, ...sitting }) => ({
        ...sitting,
        ...(agenda ? { agenda: htmlToText(agenda) } : {}),
      }));

    return {
      content: [
        {
          type: "text" as const,
          text: `${sittings.notice ?? ""}Fetched ${result.length} sittings of committee ${code} in term ${term}:\n\n${JSON.stringify(result, null, 2)}`,
        },
      ],
    };
  },
};

export const getCommitteeSittingTool = {
  description: "Get details about a single committee sitting",
  schema: {
    term: z.number().int().positive().describe("Term of the Sejm"),
    code: COMMITTEE_CODE,
    num: z.number().int().positive().describe("Number of the committee sitting"),
  },
  handler: async (args: { term: number, code: string, num: number }) => {
    const { term, code, num } = args;
    const sitting = await makeSejmRequest<CommitteeSitting>(
      `/term${term}/committees/${code}/sittings/${num}`
    );

    if (!sitting.ok) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Failed to fetch sitting ${num} of committee ${code} in term ${term}.\n\nError: ${sitting.error.message}`,
          },
        ],
        isError: true,
      };
    }

    const { agenda, ...details } = sitting.data;
    const result = agenda ? { ...details, agenda: htmlToText(agenda) } : details;

    return {
      content: [
        {
          type: "text" as const,
          text: `${sitting.notice ?? ""}Fetched sitting ${num} of committee ${code} in term ${term}:\n\n${JSON.stringify(result, null, 2)}`,
        },
      ],
    };
  },
};
