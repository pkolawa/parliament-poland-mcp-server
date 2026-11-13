import { z } from "zod";

/*
 * Input parameters shared by many tools. Each call creates a new schema, because a schema
 * instance used twice in one tool becomes a JSON Schema $ref that some clients do not resolve.
 */

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const DATE_TIME = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2})?)?$/;

export const term = () =>
  z
    .number()
    .int()
    .positive()
    .optional()
    .describe("Term of the Sejm (kadencja), e.g. 10; defaults to the current term (see get-terms)");

export const offset = () =>
  z.number().int().nonnegative().optional().describe("Number of items to skip, for pagination; defaults to 0");

export const limit = (defaultLimit = 50) =>
  z
    .number()
    .int()
    .positive()
    .optional()
    .describe(`Maximum number of items to return; defaults to ${defaultLimit}`);

export const date = (description: string) =>
  z.string().regex(DATE, "Expected a date in YYYY-MM-DD format").describe(`${description}, in YYYY-MM-DD format`);

export const dateTime = (description: string) =>
  z
    .string()
    .regex(DATE_TIME, "Expected a date in YYYY-MM-DD or YYYY-MM-DDTHH:MM:SS format")
    .describe(`${description}, in YYYY-MM-DD or YYYY-MM-DDTHH:MM:SS format`);

export const mpId = () =>
  z.number().int().positive().describe("ID of the MP (poseł): the `id` field from get-members");

export const sitting = () =>
  z
    .number()
    .int()
    .positive()
    .describe("Number of the plenary sitting (posiedzenie Sejmu): the `number` field from get-proceedings");

export const sittingDate = () =>
  date("Day of the sitting (one of the `dates` of the sitting in get-proceedings)");

export const committeeCode = () =>
  z
    .string()
    .regex(/^[A-Za-z0-9]+$/, "Expected a committee code such as ASW")
    .describe("Code of the committee (komisja), e.g. ASW or FPB: the `code` field from get-committees");

export const printNumber = (description: string) =>
  z
    .string()
    .regex(/^\d+(-[0-9A-Za-z]+)?$/, "Expected a print number such as 1070 or 1070-A")
    .describe(description);

export const title = (what: string) =>
  z
    .string()
    .min(1)
    .optional()
    .describe(`Phrase to search for in the title of the ${what}, in Polish (e.g. podatek dochodowy)`);
