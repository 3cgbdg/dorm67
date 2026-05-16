import Anthropic from "@anthropic-ai/sdk";
import type { MessageParam, Tool } from "@anthropic-ai/sdk/resources/messages/messages.mjs";
import { z } from "zod";
import { env } from "../config.js";

function getClient(): Anthropic {
  if (!env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY is not configured");
  }
  return new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
}

/** Anthropic long-output beta; probe at boot — if unsupported, clamp max_tokens to 16k. */
const LONG_OUTPUT_BETA = "output-128k-2025-02-19";

let longOutputProbeDone = false;
let longOutputSupported = false;

export function isLongOutputSupported(): boolean {
  return longOutputSupported;
}

/**
 * One cheap request with the beta header. Call once before heavy Taras traffic.
 * If it fails, we clamp max_tokens to 16384 for the process lifetime.
 */
export async function probeAnthropicLongOutput(): Promise<boolean> {
  if (longOutputProbeDone) return longOutputSupported;
  longOutputProbeDone = true;
  if (!env.ANTHROPIC_API_KEY) {
    longOutputSupported = false;
    return false;
  }
  try {
    await getClient().messages.create(
      {
        model: env.TARAS_ANTHROPIC_MODEL,
        max_tokens: 32,
        messages: [{ role: "user", content: "ping" }],
      },
      { headers: { "anthropic-beta": LONG_OUTPUT_BETA } }
    );
    longOutputSupported = true;
    // eslint-disable-next-line no-console
    console.log("[taras] Anthropic long-output beta header accepted.");
  } catch (e) {
    longOutputSupported = false;
    // eslint-disable-next-line no-console
    console.warn(
      "[taras] Long-output beta not available; max_tokens clamped to 16384.",
      e instanceof Error ? e.message : e
    );
  }
  return longOutputSupported;
}

export function clampMaxTokens(requested: number): number {
  const r = Math.max(1, Math.floor(requested));
  if (longOutputSupported) return Math.min(r, 64_000);
  return Math.min(r, 16_384);
}

export type RetryMeta = {
  retries: number;
  rateLimitHits: number;
  had429: boolean;
};

function isRetriableTransportError(err: unknown): boolean {
  const status = (err as { status?: number })?.status;
  if (status === 429) return true;
  if (status === 503) return true;
  const type = (err as { error?: { type?: string } })?.error?.type;
  if (type === "overloaded_error") return true;
  if (type === "rate_limit_error") return true;
  const msg = err instanceof Error ? err.message : String(err);
  if (/429|rate limit|overloaded|503/i.test(msg)) return true;
  return false;
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options?: { maxRetries?: number }
): Promise<{ result: T; meta: RetryMeta }> {
  const maxRetries = options?.maxRetries ?? 4;
  let retries = 0;
  let rateLimitHits = 0;
  let had429 = false;
  let lastErr: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await fn();
      return { result, meta: { retries, rateLimitHits, had429 } };
    } catch (err) {
      lastErr = err;
      const status = (err as { status?: number })?.status;
      if (status === 429) {
        had429 = true;
        rateLimitHits += 1;
      }
      if (!isRetriableTransportError(err) || attempt === maxRetries) {
        throw err;
      }
      retries += 1;
      const delayMs = Math.min(30_000, 1000 * 2 ** attempt);
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}

export type AnthropicCallCompleteInfo = {
  model: string;
  durationMs: number;
  inputTokens?: number;
  outputTokens?: number;
  retries: number;
  rateLimitHits: number;
  had429: boolean;
  ok: boolean;
  errorKind?: string;
};

function extractToolJson(response: Anthropic.Messages.Message): unknown {
  for (const block of response.content) {
    if (block.type === "tool_use") {
      return block.input;
    }
  }
  const text = response.content
    .filter((b): b is Anthropic.Messages.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start >= 0 && end > start) {
    return JSON.parse(text.slice(start, end + 1)) as unknown;
  }
  throw new Error("Model did not return JSON");
}

export async function callAnthropicToolJson<T>(params: {
  system: string;
  messages: MessageParam[];
  tools: Tool[];
  toolName: string;
  parse: (raw: unknown) => T;
  maxTokens?: number;
  model?: string;
  onCallComplete?: (info: AnthropicCallCompleteInfo) => void;
}): Promise<T> {
  const client = getClient();
  const maxTokens = clampMaxTokens(params.maxTokens ?? 8192);
  const model = params.model || env.TARAS_ANTHROPIC_MODEL;
  let messages = params.messages;
  const requestOptions = longOutputSupported
    ? { headers: { "anthropic-beta": LONG_OUTPUT_BETA } as Record<string, string> }
    : undefined;

  for (let attempt = 0; attempt < 2; attempt++) {
    const startedAt = Date.now();
    let retries = 0;
    let rateLimitHits = 0;
    let had429 = false;
    let response: Anthropic.Messages.Message;
    try {
      const wrapped = await withRetry(
        () =>
          client.messages.create(
            {
              model,
              max_tokens: maxTokens,
              system: params.system,
              tools: params.tools,
              tool_choice: { type: "tool", name: params.toolName },
              messages,
            },
            requestOptions
          ),
        { maxRetries: 4 }
      );
      response = wrapped.result;
      retries = wrapped.meta.retries;
      rateLimitHits = wrapped.meta.rateLimitHits;
      had429 = wrapped.meta.had429;
    } catch (err) {
      const durationMs = Date.now() - startedAt;
      params.onCallComplete?.({
        model,
        durationMs,
        retries,
        rateLimitHits,
        had429,
        ok: false,
        errorKind: isRetriableTransportError(err) ? "rate_limit" : "other",
      });
      throw err;
    }

    const durationMs = Date.now() - startedAt;
    const usage = response.usage;
    const inputTokens = usage?.input_tokens;
    const outputTokens = usage?.output_tokens;

    let raw: unknown;
    try {
      raw = extractToolJson(response);
    } catch {
      params.onCallComplete?.({
        model,
        durationMs,
        inputTokens,
        outputTokens,
        retries,
        rateLimitHits,
        had429,
        ok: false,
        errorKind: "invalid_json",
      });
      if (attempt === 1) throw new Error("Failed to parse model JSON");
      messages = [
        ...messages,
        {
          role: "user",
          content: "Reply again using the required tool with valid JSON only.",
        },
      ];
      continue;
    }

    try {
      const parsed = params.parse(raw);
      params.onCallComplete?.({
        model,
        durationMs,
        inputTokens,
        outputTokens,
        retries,
        rateLimitHits,
        had429,
        ok: true,
      });
      return parsed;
    } catch (err) {
      const msg = err instanceof z.ZodError ? err.flatten().fieldErrors : String(err);
      params.onCallComplete?.({
        model,
        durationMs,
        inputTokens,
        outputTokens,
        retries,
        rateLimitHits,
        had429,
        ok: false,
        errorKind: "schema",
      });
      if (attempt === 1) throw err;
      messages = [
        ...messages,
        {
          role: "user",
          content: `JSON validation failed. Fix and call the tool again. Errors:\n${JSON.stringify(msg)}`,
        },
      ];
    }
  }

  throw new Error("Unreachable");
}

export const templateStyleTool: Tool = {
  name: "emit_template_style",
  description: "Emit structured template style hints from images.",
  input_schema: {
    type: "object",
    additionalProperties: true,
    properties: {
      inferredLanguage: { type: "string", enum: ["uk", "en", "ru", "unknown"] },
      hasTable: { type: "boolean" },
      headingStyle: { type: "string" },
      register: { type: "string", enum: ["formal", "neutral", "unknown"] },
      notes: { type: "string" },
    },
    required: ["notes"],
  },
};

export const outlineTool: Tool = {
  name: "emit_outline",
  description: "Emit lab report outline JSON.",
  input_schema: {
    type: "object",
    properties: {
      schemaVersion: { type: "number", enum: [1] },
      sections: {
        type: "array",
        items: {
          type: "object",
          properties: {
            heading: { type: "string" },
            summary: { type: "string" },
          },
          required: ["heading", "summary"],
        },
      },
    },
    required: ["schemaVersion", "sections"],
  },
};

export const reportTool: Tool = {
  name: "emit_report",
  description: "Emit full structured lab report JSON.",
  input_schema: {
    type: "object",
    additionalProperties: true,
    properties: {
      schemaVersion: { type: "number", enum: [1] },
      metadata: { type: "object" },
      language: { type: "string", enum: ["uk", "en", "ru"] },
      sections: { type: "array" },
      conclusions: { type: "array", items: { type: "string" } },
    },
    required: ["schemaVersion", "metadata", "language", "sections", "conclusions"],
  },
};

const tableSchema = {
  type: "object",
  properties: {
    headers: { type: "array", items: { type: "string" }, maxItems: 20 },
    rows: {
      type: "array",
      items: { type: "array", items: { type: "string" }, maxItems: 20 },
      maxItems: 50,
    },
  },
  required: ["headers", "rows"],
} as const;

const ledgerDeltaSchema = {
  type: "object" as const,
  additionalProperties: false,
  properties: {
    symbols: {
      type: "array",
      maxItems: 40,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          name: { type: "string" },
          meaning: { type: "string" },
          unit: { type: "string" },
        },
        required: ["name", "meaning"],
      },
    },
    assumptions: {
      type: "array",
      maxItems: 20,
      items: {
        type: "object",
        additionalProperties: false,
        properties: { text: { type: "string" } },
        required: ["text"],
      },
    },
    computedResults: {
      type: "array",
      maxItems: 40,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          name: { type: "string" },
          value: { type: "string" },
          unit: { type: "string" },
        },
        required: ["name", "value"],
      },
    },
  },
} as const;

/** One report section + optional ledger delta for cross-section consistency. */
export const sectionTool: Tool = {
  name: "emit_section",
  description: "Emit one lab report section (heading, body, optional table/formula) plus optional ledger delta.",
  input_schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      heading: { type: "string" },
      paragraphs: { type: "array", items: { type: "string" }, maxItems: 40 },
      bullets: { type: "array", items: { type: "string" }, maxItems: 60 },
      table: tableSchema,
      formula: { type: "string" },
      ledgerDelta: ledgerDeltaSchema,
    },
    required: ["heading"],
  },
};

export const taskClassifierTool: Tool = {
  name: "emit_task_classification",
  description: "Classify the lab task type and emit method hints.",
  input_schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      taskType: { type: "string" },
      methodHints: { type: "array", items: { type: "string" }, maxItems: 12 },
      requiresCalculation: { type: "boolean" },
    },
    required: ["taskType", "methodHints", "requiresCalculation"],
  },
};

export const conclusionsTool: Tool = {
  name: "emit_conclusions",
  description: "Emit report conclusions as plain strings.",
  input_schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      conclusions: { type: "array", items: { type: "string" }, minItems: 1, maxItems: 12 },
    },
    required: ["conclusions"],
  },
};

export const measurementTableTool: Tool = {
  name: "emit_measurements_table",
  description: "Extract a structured measurements table from task screenshots/text.",
  input_schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      headers: { type: "array", items: { type: "string" }, maxItems: 20 },
      rows: { type: "array", items: { type: "array", items: { type: "string" }, maxItems: 20 }, maxItems: 50 },
      confidence: { type: "number" },
      notes: { type: "string" },
    },
    required: ["headers", "rows", "notes"],
  },
};
