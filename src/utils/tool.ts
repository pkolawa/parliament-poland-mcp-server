import { z } from "zod";
import { makeSejmRequest, type SejmApiError, type SejmApiResult } from "./api.js";
import type { Term } from "../types/api.js";

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
  outputSchema?: z.AnyZodObject;
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
export function listOutput(item: z.ZodTypeAny): z.AnyZodObject {
  return z.object({ items: z.array(item), notice });
}

/** Output schema of a tool that returns a single object. */
export function objectOutput(schema: z.AnyZodObject): z.AnyZodObject {
  return schema.extend({ notice });
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

  const numbers = terms.data.filter((t) => typeof t.num === "number");
  const current = numbers.find((t) => t.current) ?? numbers.sort((a, b) => b.num! - a.num!)[0];
  return current
    ? { ok: true, term: current.num! }
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
