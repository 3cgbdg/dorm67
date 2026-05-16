import type { MessageParam } from "@anthropic-ai/sdk/resources/messages/messages.mjs";
import {
  callAnthropicToolJson,
  outlineTool,
  reportTool,
  templateStyleTool,
} from "../anthropic.js";
import { OutlineSchemaV1, TemplateStyleSchema, type TemplateStyle } from "./outline.js";
import {
  buildUserPayloadBlock,
  formatTemplateStyle,
  outlineSystemPrompt,
  templateAnalyzeSystemPrompt,
  fullReportSystemPrompt,
  refineSystemPrompt,
} from "./prompts.js";
import type { TarasLanguage, TarasInputs } from "./sanitizeInputs.js";
import { inputsToPromptParts, sanitizeInstruction } from "./sanitizeInputs.js";
import { parseReportJsonV1, type ReportJsonV1 } from "./schema.js";

export async function analyzeTemplateFromBuffers(params: {
  imageBuffers: Buffer[];
  mediaTypes: string[];
  pastedText?: string;
}): Promise<TemplateStyle> {
  const content: MessageParam["content"] = [];
  for (let i = 0; i < params.imageBuffers.length; i++) {
    const b64 = params.imageBuffers[i].toString("base64");
    const mt = params.mediaTypes[i] || "image/jpeg";
    content.push({
      type: "image",
      source: {
        type: "base64",
        media_type: mt as "image/jpeg" | "image/png" | "image/gif" | "image/webp",
        data: b64,
      },
    });
  }
  const textParts: string[] = [
    "Analyze these template images for a university lab report. Return JSON via the tool.",
  ];
  if (params.pastedText?.trim()) {
    textParts.push(
      `Optional pasted template text (style only):\n${sanitizeInstruction(params.pastedText, 8000)}`
    );
  }
  content.push({ type: "text", text: textParts.join("\n\n") });

  return callAnthropicToolJson({
    system: templateAnalyzeSystemPrompt(),
    messages: [{ role: "user", content }],
    tools: [templateStyleTool],
    toolName: "emit_template_style",
    parse: (raw) => TemplateStyleSchema.parse(raw),
    maxTokens: 2048,
  });
}

export type JobMetadata = {
  subject: string;
  labNumber: string;
  topic: string;
  variant?: string;
  studentName: string;
  group: string;
};

export async function generateReportJson(params: {
  inputs: TarasInputs;
  templateStyle: TemplateStyle;
  language: TarasLanguage;
  metadata: JobMetadata;
}): Promise<ReportJsonV1> {
  const { inputs, templateStyle, language, metadata } = params;
  const parts = inputsToPromptParts(inputs);
  const metaBlock = buildUserPayloadBlock({
    subject: metadata.subject,
    lab_number: metadata.labNumber,
    topic: metadata.topic,
    variant: metadata.variant ?? "",
    student: metadata.studentName,
    group: metadata.group,
    ...parts,
    template_style_json: formatTemplateStyle(templateStyle),
  });

  const outline = await callAnthropicToolJson({
    system: outlineSystemPrompt(language),
    messages: [{ role: "user", content: metaBlock }],
    tools: [outlineTool],
    toolName: "emit_outline",
    parse: (raw) => OutlineSchemaV1.parse(raw),
    maxTokens: 4096,
  });

  const outlineText = JSON.stringify(outline, null, 2);

  const report = await callAnthropicToolJson({
    system: fullReportSystemPrompt(language),
    messages: [
      {
        role: "user",
        content: `${metaBlock}\n\nApproved outline (JSON):\n${outlineText}`,
      },
    ],
    tools: [reportTool],
    toolName: "emit_report",
    parse: (raw) => parseReportJsonV1(raw),
    maxTokens: 8192,
  });

  const today = new Date().toISOString().slice(0, 10);
  report.metadata.subject = metadata.subject;
  report.metadata.labNumber = metadata.labNumber;
  report.metadata.topic = metadata.topic;
  report.metadata.studentName = metadata.studentName;
  report.metadata.group = metadata.group;
  if (metadata.variant) report.metadata.variant = metadata.variant;
  report.metadata.date = today;
  report.metadata.title =
    report.metadata.title ||
    `Lab ${metadata.labNumber} — ${metadata.topic}`.slice(0, 500);
  report.language = language;

  return parseReportJsonV1(report);
}

export async function refineReportJson(params: {
  report: ReportJsonV1;
  instruction: string;
  language: TarasLanguage;
}): Promise<ReportJsonV1> {
  const instr = sanitizeInstruction(params.instruction, 500);
  const block = buildUserPayloadBlock({
    instruction: instr,
    current_report_json: JSON.stringify(params.report),
  });

  return callAnthropicToolJson({
    system: refineSystemPrompt(params.language),
    messages: [{ role: "user", content: block }],
    tools: [reportTool],
    toolName: "emit_report",
    parse: (raw) => parseReportJsonV1(raw),
    maxTokens: 8192,
  });
}
