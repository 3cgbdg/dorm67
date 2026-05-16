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
}): Promise<T> {
  const client = getClient();
  const maxTokens = params.maxTokens ?? 8192;
  let messages = params.messages;

  for (let attempt = 0; attempt < 2; attempt++) {
    const response = await client.messages.create({
      model: env.TARAS_ANTHROPIC_MODEL,
      max_tokens: maxTokens,
      system: params.system,
      tools: params.tools,
      tool_choice: { type: "tool", name: params.toolName },
      messages,
    });

    let raw: unknown;
    try {
      raw = extractToolJson(response);
    } catch {
      if (attempt === 1) throw new Error("Failed to parse model JSON");
      messages = [
        ...messages,
        { role: "assistant", content: response.content },
        {
          role: "user",
          content: "Reply again using the required tool with valid JSON only.",
        },
      ];
      continue;
    }

    try {
      return params.parse(raw);
    } catch (err) {
      const msg = err instanceof z.ZodError ? err.flatten().fieldErrors : String(err);
      if (attempt === 1) throw err;
      messages = [
        ...messages,
        { role: "assistant", content: response.content },
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
