import { z } from "zod";
import { makeSejmRequest } from "../utils/api.js";
import { htmlToText } from "../utils/html.js";
import { buildToolResponse, defineTool, objectOutput, withTerm } from "../utils/tool.js";
import { StatementListSchema, type StatementList } from "../types/api.js";
import { sitting, sittingDate, term } from "./params.js";

export const getTranscriptsTool = defineTool({
  title: "List statements of a sitting day",
  description:
    "List the statements (wypowiedzi) in the transcript (stenogram) of one day of a plenary sitting: " +
    "statement number, speaker, function, MP ID and time. Get the text of a statement with get-statement.",
  schema: {
    term: term(),
    proceeding: sitting(),
    date: sittingDate(),
  },
  outputSchema: objectOutput(StatementListSchema),
  handler: ({ term, proceeding, date }) =>
    withTerm(term, async (term) =>
      buildToolResponse(
        await makeSejmRequest<StatementList>(`/term${term}/proceedings/${proceeding}/${date}/transcripts`),
        `Fetched the transcript statements for sitting ${proceeding} on ${date} in term ${term}:`,
        `Failed to fetch the transcript statements for sitting ${proceeding} on ${date} in term ${term}.`
      )
    ),
});

export const getStatementTool = defineTool({
  title: "Get the text of a statement",
  description: "Get the text of one statement (wypowiedź) from the transcript (stenogram) of a plenary sitting, as plain text.",
  schema: {
    term: term(),
    proceeding: sitting(),
    date: sittingDate(),
    statementNum: z
      .number()
      .int()
      .nonnegative()
      .describe("Number of the statement: the `num` field from get-transcripts; 0 is the course of the sitting"),
  },
  handler: ({ term, proceeding, date, statementNum }) =>
    withTerm(term, async (term) =>
      buildToolResponse(
        await makeSejmRequest<string>(
          `/term${term}/proceedings/${proceeding}/${date}/transcripts/${statementNum}`,
          undefined,
          { format: "html" }
        ),
        `Fetched statement ${statementNum} from sitting ${proceeding} on ${date} in term ${term}:`,
        `Failed to fetch statement ${statementNum} from sitting ${proceeding} on ${date} in term ${term}.`,
        htmlToText
      )
    ),
});
