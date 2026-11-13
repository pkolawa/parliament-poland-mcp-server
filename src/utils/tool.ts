import { z } from "zod";
import { makeSejmRequest, type SejmApiError, type SejmApiResult } from "./api.js";
import type { Term } from "../types/api.js";

/** Any object schema; `z.AnyZodObject` does not exist in Zod 4. */
export type ObjectSchema = z.ZodObject<any, any>;

export interface ToolResponse {
  [key: string]: unknown;
  content: { type: "text"; text: string }[];
  /** The data as an object, matching the tool's outputSchema; absent for errors and plain-text tools. */
  structuredContent?: Record<string, unknown>;
  isError?: true;
}

export interface ToolDefinition<Shape extends z.ZodRawShape> {
  /** Human-readable name shown by MCP clients. */
  title: string;
  description: string;
  schema: Shape;
  /** Schema of `structuredContent`; absent for tools that return plain text. */
  outputSchema?: ObjectSchema;
  handler: (args: z.infer<z.ZodObject<Shape>>) => Promise<ToolResponse>;
}

/** Infers the handler's argument types from the input schema. */
export function defineTool<Shape extends z.ZodRawShape>(tool: ToolDefinition<Shape>): ToolDefinition<Shape> {
  return tool;
}

const notice = z
  .string()
  .optional()
  .describe("Set when the Sejm API is unavailable and the data comes from a cache; it may be out of date");

/** Output schema of a tool that returns a list: `{ items: [...] }`. */
export function listOutput(item: z.ZodType): ObjectSchema {
  return z.object({ items: z.array(item), notice });
}

/** Output schema of a tool that returns a single object. */
export function objectOutput(schema: ObjectSchema): ObjectSchema {
  return schema.extend({ notice });
}

/**
 * One page of a list that the server paginates itself, because the Sejm API returns the whole list
 * and ignores (or does not document) `offset` and `limit`.
 */
export interface Page<T> {
  /** Number of matching items on all pages. */
  total: number;
  offset: number;
  /** Offset of the next page; absent on the last page. */
  nextOffset?: number;
  items: T[];
}

/** Returns `limit` items starting at `offset`, or all items from `offset` when `limit` is undefined. */
export function paginate<T>(items: T[], offset = 0, limit?: number): Page<T> {
  const end = limit === undefined ? items.length : offset + limit;
  return {
    total: items.length,
    offset,
    ...(end < items.length ? { nextOffset: end } : {}),
    items: items.slice(offset, end),
  };
}

/** Output schema of a tool that returns a `Page`. */
export function pagedListOutput(item: z.ZodType): ObjectSchema {
  return z.object({
    total: z.number().describe("Number of matching items on all pages"),
    offset: z.number().describe("Number of matching items skipped before this page"),
    nextOffset: z.number().optional().describe("Pass as `offset` to get the next page; absent on the last page"),
    items: z.array(item),
    notice,
  });
}

/**
 * Describes which part of a list a page is, e.g. "50 of 147 votings (offset 0; pass offset=50 for
 * the next page)", so the model knows the list is incomplete and how to get the rest.
 */
export function describePage(page: Page<unknown>, noun: string): string {
  const { total, offset, nextOffset, items } = page;
  if (total === 0) {
    return `no ${noun}`;
  }
  if (items.length === total) {
    return `${total} ${noun}`;
  }
  if (items.length === 0) {
    return `0 of ${total} ${noun} (offset ${offset} is past the end of the list)`;
  }
  const next = nextOffset === undefined ? "last page" : `pass offset=${nextOffset} for the next page`;
  return `${items.length} of ${total} ${noun} (offset ${offset}; ${next})`;
}

/** " matching club=KO, active=true" for the filters that are set, or "" when none is. */
export function describeFilters(filters: Record<string, string | number | boolean | undefined>): string {
  const set = Object.entries(filters).filter(([, value]) => value !== undefined);
  return set.length ? ` matching ${set.map(([key, value]) => `${key}=${value}`).join(", ")}` : "";
}

export function errorResponse(failure: string, message: string): ToolResponse {
  return {
    content: [{ type: "text", text: `${failure}\n\nError: ${message}` }],
    isError: true,
  };
}

/**
 * Turns the result of a Sejm API request into a tool response.
 *
 * On success the text is `success` followed by the data: compact JSON, or the string itself for
 * plain-text tools. JSON data is also returned as `structuredContent` (lists as `{ items }`).
 * Data served from the cache while the API is down is prefixed with the cache notice.
 * On failure the text is `failure` followed by the error, with `isError: true`.
 */
export function buildToolResponse<T, R = T>(
  result: SejmApiResult<T>,
  success: string | ((data: R) => string),
  failure: string,
  transform?: (data: T) => R
): ToolResponse {
  if (!result.ok) {
    return errorResponse(failure, result.error.message);
  }

  const data = transform ? transform(result.data) : (result.data as unknown as R);
  const message = typeof success === "function" ? success(data) : success;
  const prefix = result.notice ?? "";

  if (typeof data === "string") {
    return { content: [{ type: "text", text: `${prefix}${message}\n\n${data}` }] };
  }

  const structuredContent: Record<string, unknown> = Array.isArray(data)
    ? { items: data }
    : { ...(data as Record<string, unknown>) };
  if (result.notice) {
    structuredContent.notice = result.notice.trim();
  }

  return {
    content: [{ type: "text", text: `${prefix}${message}\n\n${JSON.stringify(data)}` }],
    structuredContent,
  };
}

type TermResult = { ok: true; term: number } | { ok: false; error: SejmApiError };

/** Returns `term` if given, otherwise the number of the current term of the Sejm. */
export async function resolveTerm(term: number | undefined): Promise<TermResult> {
  if (term !== undefined) {
    return { ok: true, term };
  }

  // The list of terms is cached for an hour, so this rarely calls the API.
  const terms = await makeSejmRequest<Term[]>("/term");
  if (!terms.ok) {
    return terms;
  }

  const numbered = terms.data.filter((t): t is Term & { num: number } => typeof t.num === "number");
  const current = numbered.find((t) => t.current) ?? numbered.sort((a, b) => b.num - a.num)[0];
  return current
    ? { ok: true, term: current.num }
    : { ok: false, error: { message: "The Sejm API returned no terms." } };
}

/** Runs `run` with the given term, or with the current term when `term` is omitted. */
export async function withTerm(
  term: number | undefined,
  run: (term: number) => Promise<ToolResponse>
): Promise<ToolResponse> {
  const resolved = await resolveTerm(term);
  if (!resolved.ok) {
    return errorResponse(
      "Failed to determine the current term of the Sejm; pass the term number explicitly.",
      resolved.error.message
    );
  }
  return run(resolved.term);
}
