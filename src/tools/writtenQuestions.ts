import { z } from "zod";
import { makeSejmRequest } from "../utils/api.js";
import { buildToolResponse, defineTool, listOutput, withTerm } from "../utils/tool.js";
import { WrittenQuestionSchema, type WrittenQuestion } from "../types/api.js";
import { date, dateTime, limit, offset, term, title } from "./params.js";

export const getWrittenQuestionsTool = defineTool({
  title: "Search written questions",
  description:
    "Search written questions (zapytania poselskie: questions from MPs to a minister on a specific, usually local " +
    "or individual matter; simpler than interpellations, answered within 21 days). Returns number, title, " +
    "author MP IDs, recipients, dates and replies.",
  schema: {
    term: term(),
    title: title("question"),
    from: z
      .string()
      .regex(/^\d+$/, "Expected an MP ID such as 123")
      .optional()
      .describe("Only questions submitted by the MP with this ID (see get-members), e.g. 123"),
    to: z
      .string()
      .min(1)
      .optional()
      .describe("Only questions sent to this recipient, in Polish (e.g. minister zdrowia)"),
    since: date("Only questions sent on or after this date").optional(),
    till: date("Only questions sent before this date").optional(),
    modifiedSince: dateTime("Only questions changed since this time (e.g. that received a reply)").optional(),
    delayed: z.boolean().optional().describe("Only questions whose answer is overdue"),
    sort_by: z
      .string()
      .regex(/^-?[A-Za-z]+$/, "Expected a field name, optionally prefixed with -")
      .optional()
      .describe("Field to sort by, e.g. num or receiptDate; prefix with - for descending order (e.g. -receiptDate)"),
    offset: offset(),
    limit: limit(),
  },
  outputSchema: listOutput(WrittenQuestionSchema),
  handler: ({ term, title, from, to, since, till, modifiedSince, delayed, sort_by, offset, limit }) =>
    withTerm(term, async (term) =>
      buildToolResponse(
        await makeSejmRequest<WrittenQuestion[]>(`/term${term}/writtenQuestions`, {
          offset,
          limit,
          sort_by,
          title,
          from,
          to,
          since,
          till,
          modifiedSince,
          delayed,
        }),
        `Fetched the list of written questions for term ${term}:`,
        `Failed to fetch the list of written questions for term ${term}.`
      )
    ),
});
