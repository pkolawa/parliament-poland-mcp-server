import { z } from "zod";
import { makeSejmRequest } from "../utils/api.js";
import { htmlToText } from "../utils/html.js";
import { buildToolResponse, defineTool, listOutput, objectOutput, withTerm } from "../utils/tool.js";
import { InterpellationSchema, type Interpellation } from "../types/api.js";
import { date, dateTime, limit, offset, term, title } from "./params.js";

const interpellationNumber = () =>
  z.number().int().positive().describe("Number of the interpellation: the `num` field from get-interpellations");

export const getInterpellationsTool = defineTool({
  title: "Search interpellations",
  description:
    "Search interpellations (interpelacje: formal written questions on matters of policy that MPs address to the " +
    "Prime Minister or a minister, who must answer within 21 days). Returns number, title, author MP IDs, " +
    "recipients, dates and replies. Use get-interpellation-text for the text. " +
    "Shorter questions on specific matters are written questions (get-written-questions).",
  schema: {
    term: term(),
    title: title("interpellation"),
    mp: z.number().int().positive().optional().describe("Only interpellations submitted by the MP with this ID (see get-members)"),
    recipient: z
      .string()
      .min(1)
      .optional()
      .describe("Only interpellations sent to this recipient, in Polish (e.g. minister zdrowia)"),
    dateFrom: date("Only interpellations sent on or after this date").optional(),
    dateTo: date("Only interpellations sent before this date").optional(),
    modifiedSince: dateTime("Only interpellations changed since this time (e.g. that received a reply)").optional(),
    delayed: z.boolean().optional().describe("Only interpellations whose answer is overdue"),
    sort_by: z
      .string()
      .regex(/^-?[A-Za-z]+$/, "Expected a field name, optionally prefixed with -")
      .optional()
      .describe("Field to sort by, e.g. num or receiptDate; prefix with - for descending order (e.g. -receiptDate)"),
    offset: offset(),
    limit: limit(),
  },
  outputSchema: listOutput(InterpellationSchema),
  handler: ({ term, title, mp, recipient, dateFrom, dateTo, modifiedSince, delayed, sort_by, offset, limit }) =>
    withTerm(term, async (term) =>
      buildToolResponse(
        await makeSejmRequest<Interpellation[]>(`/term${term}/interpellations`, {
          title,
          from: mp,
          to: recipient,
          since: dateFrom,
          till: dateTo,
          modifiedSince,
          delayed,
          sort_by,
          offset,
          limit,
        }),
        `Fetched the list of interpellations for term ${term}:`,
        `Failed to fetch the list of interpellations for term ${term}.`
      )
    ),
});

export const getInterpellationTool = defineTool({
  title: "Get an interpellation",
  description:
    "Get the details of one interpellation (interpelacja): title, author MP IDs, recipients, dates, " +
    "how many days the answer is overdue, and its replies with their keys and attachments. " +
    "Use get-interpellation-text for the text of the interpellation or of a reply.",
  schema: {
    term: term(),
    id: interpellationNumber(),
  },
  outputSchema: objectOutput(InterpellationSchema),
  handler: ({ term, id }) =>
    withTerm(term, async (term) =>
      buildToolResponse(
        await makeSejmRequest<Interpellation>(`/term${term}/interpellations/${id}`),
        `Fetched details for interpellation ${id} in term ${term}:`,
        `Failed to fetch details for interpellation ${id} in term ${term}.`
      )
    ),
});

export const getInterpellationTextTool = defineTool({
  title: "Get the text of an interpellation",
  description: "Get the text of an interpellation (interpelacja) or of a reply to it, as plain text.",
  schema: {
    term: term(),
    num: interpellationNumber(),
    replyKey: z
      .string()
      .regex(/^[A-Za-z0-9]+$/, "Expected a reply key such as CZLJNC")
      .optional()
      .describe(
        "Key of a reply (replies[].key from get-interpellation); omit to get the interpellation itself. " +
          "A reply with onlyAttachment=true has its content only in the attached PDF"
      ),
  },
  handler: ({ term, num, replyKey }) =>
    withTerm(term, async (term) => {
      const subject = replyKey ? `reply ${replyKey} to interpellation ${num}` : `interpellation ${num}`;
      return buildToolResponse(
        await makeSejmRequest<string>(
          `/term${term}/interpellations/${num}${replyKey ? `/reply/${replyKey}` : ""}/body`,
          undefined,
          { format: "html" }
        ),
        `Fetched the text of ${subject} in term ${term}:`,
        `Failed to fetch the text of ${subject} in term ${term}.`,
        htmlToText
      );
    }),
});
