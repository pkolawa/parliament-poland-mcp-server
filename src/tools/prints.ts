import { z } from "zod";
import { makeSejmRequest } from "../utils/api.js";
import { buildToolResponse, defineTool, listOutput, objectOutput, withTerm } from "../utils/tool.js";
import { PrintSchema, type Print } from "../types/api.js";
import { limit, offset, printNumber, term } from "./params.js";

export const getPrintsTool = defineTool({
  title: "List prints",
  description:
    "List Sejm prints (druki sejmowe: the numbered documents the Sejm works on, such as bills, committee reports " +
    "and opinions) with number, title, dates and attachment file names. " +
    "A bill's print number also identifies its legislative process (get-process).",
  schema: {
    term: term(),
    sort_by: z
      .string()
      .regex(/^-?[A-Za-z]+$/, "Expected a field name, optionally prefixed with -")
      .optional()
      .describe("Field to sort by, e.g. documentDate; prefix with - for descending order (e.g. -changeDate for the most recently changed)"),
    offset: offset(),
    limit: limit(),
  },
  outputSchema: listOutput(PrintSchema),
  handler: ({ term, offset, limit, sort_by }) =>
    withTerm(term, async (term) =>
      buildToolResponse(
        await makeSejmRequest<Print[]>(`/term${term}/prints`, { offset, limit, sort_by }),
        `Fetched the list of prints for term ${term}:`,
        `Failed to fetch the list of prints for term ${term}.`
      )
    ),
});

export const getPrintTool = defineTool({
  title: "Get a print",
  description:
    "Get one Sejm print (druk): title, dates, attachment file names, associated prints and the legislative processes it belongs to.",
  schema: {
    term: term(),
    printNumber: printNumber("Number of the print, e.g. 1070, or 1070-A for an additional print: the `number` field from get-prints"),
  },
  outputSchema: objectOutput(PrintSchema),
  handler: ({ term, printNumber }) =>
    withTerm(term, async (term) =>
      buildToolResponse(
        await makeSejmRequest<Print>(`/term${term}/prints/${printNumber}`),
        `Fetched details for print ${printNumber} in term ${term}:`,
        `Failed to fetch details for print ${printNumber} in term ${term}.`
      )
    ),
});
