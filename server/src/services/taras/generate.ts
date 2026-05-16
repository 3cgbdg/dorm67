import type { MessageParam } from "@anthropic-ai/sdk/resources/messages/messages.mjs";
import { z } from "zod";
import {
  callAnthropicToolJson,
  conclusionsTool,
  outlineTool,
  reportTool,
  sectionTool,
  taskClassifierTool,
  templateStyleTool,
  type AnthropicCallCompleteInfo,
} from "../anthropic.js";
import { env } from "../../config.js";
import { OutlineSchemaV1, TemplateStyleSchema, type OutlineJsonV1, type TemplateStyle } from "./outline.js";
import {
  buildUserPayloadBlock,
  conclusionsSystemPrompt,
  formatTemplateStyle,
  fullReportSystemPrompt,
  outlineSystemPrompt,
  playbookForTaskType,
  refineSystemPrompt,
  sectionWriterSystemPrompt,
  taskClassifierSystemPrompt,
  templateAnalyzeSystemPrompt,
} from "./prompts.js";
import type { TarasLanguage, TarasInputs } from "./sanitizeInputs.js";
import { inputsToPromptParts, sanitizeInstruction } from "./sanitizeInputs.js";
import { parseReportJsonV1, ReportSectionSchema, type ReportJsonV1 } from "./schema.js";
import {
  applyDelta,
  initLedger,
  ledgerFromReport,
  mergeDeltas,
  snapshotForPrompt,
  type FactsLedger,
  type LedgerDelta,
} from "./factsLedger.js";
import {
  finalizeJobTelemetry,
  logJobTelemetrySummary,
  recordAnthropicCall,
  type JobTelemetry,
} from "./telemetry.js";
import type { BudgetHitKind } from "./telemetry.js";

type ReportSection = z.infer<typeof ReportSectionSchema>;

const SONNET = "claude-sonnet-4-6";

const FLOOR_WORDS_8_PAGES = 3200;
const TARGET_WORDS_25_PAGES = 10_000;

const JOB_BUDGET_DEFAULTS = {
  maxSections: 22,
  maxExpansionPasses: 2,
  maxWallClockMs: 25 * 60 * 1000,
};

function jobMaxOutputTokens(): number {
  return typeof env.TARAS_MAX_TOKENS_PER_JOB === "number" && env.TARAS_MAX_TOKENS_PER_JOB > 0
    ? env.TARAS_MAX_TOKENS_PER_JOB
    : 280_000;
}

class JobBudget {
  readonly maxSections: number;
  readonly maxExpansionPasses: number;
  readonly maxTotalOutputTokens: number;
  readonly maxWallClockMs: number;
  private readonly startedAt = Date.now();
  private outputTokens = 0;
  hit: BudgetHitKind = "none";

  constructor(overrides?: Partial<{ maxSections: number; maxExpansionPasses: number }>) {
    this.maxSections = overrides?.maxSections ?? JOB_BUDGET_DEFAULTS.maxSections;
    this.maxExpansionPasses = overrides?.maxExpansionPasses ?? JOB_BUDGET_DEFAULTS.maxExpansionPasses;
    this.maxTotalOutputTokens = jobMaxOutputTokens();
    this.maxWallClockMs = JOB_BUDGET_DEFAULTS.maxWallClockMs;
  }

  recordUsage(_input?: number, output?: number): void {
    this.outputTokens += output ?? 0;
    if (this.hit === "none" && this.outputTokens >= this.maxTotalOutputTokens) {
      this.hit = "tokens";
    }
  }

  exhausted(): boolean {
    if (this.hit !== "none") return true;
    if (Date.now() - this.startedAt >= this.maxWallClockMs) {
      this.hit = "wallClock";
      return true;
    }
    return false;
  }

  markExpansionsExhausted(): void {
    if (this.hit === "none") this.hit = "expansions";
  }

  summary(): string {
    const elapsed = Math.round((Date.now() - this.startedAt) / 1000);
    return `Budget: hit=${this.hit}; outputTokens≈${this.outputTokens}; elapsed=${elapsed}s; maxOut=${this.maxTotalOutputTokens}; maxWallMs=${this.maxWallClockMs}.`;
  }
}

const ClassificationSchema = z.object({
  taskType: z.string().max(80).default("generic-experimental"),
  methodHints: z.array(z.string().max(500)).max(12).default([]),
  requiresCalculation: z.boolean().default(true),
});

export type TaskClassification = z.infer<typeof ClassificationSchema>;

const LedgerDeltaSchema = z.object({
  symbols: z
    .array(
      z.object({
        name: z.string(),
        meaning: z.string(),
        unit: z.string().optional(),
      })
    )
    .optional(),
  assumptions: z.array(z.object({ text: z.string() })).optional(),
  computedResults: z
    .array(
      z.object({
        name: z.string(),
        value: z.string(),
        unit: z.string().optional(),
      })
    )
    .optional(),
});

const SectionToolOutputSchema = z.object({
  heading: z.string(),
  paragraphs: z.array(z.string()).optional(),
  bullets: z.array(z.string()).optional(),
  table: z
    .object({
      headers: z.array(z.string()),
      rows: z.array(z.array(z.string())),
    })
    .optional(),
  formula: z.string().optional(),
  ledgerDelta: LedgerDeltaSchema.optional(),
});

export type GenerateReportHooks = {
  jobId?: string;
  renewLease?: () => Promise<void>;
  onProgress?: (done: number, total: number) => Promise<void>;
  telemetry?: JobTelemetry;
};

function pickString(value: unknown, max: number, fallback = ""): string {
  const v = typeof value === "string" ? value : fallback;
  return v.trim().slice(0, max);
}

function stripPlaceholders(value: string): string {
  return value
    .replace(/\[verify\]/gi, "")
    .replace(/\[tbd\]/gi, "")
    .replace(/\[todo\]/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function countWords(text: string): number {
  const t = text.trim();
  if (!t) return 0;
  return t.split(/\s+/).length;
}

function wordCountReport(report: ReportJsonV1): number {
  let n = 0;
  for (const s of report.sections) {
    for (const p of s.paragraphs ?? []) n += countWords(p);
    for (const b of s.bullets ?? []) n += countWords(b);
    if (s.formula) n += countWords(s.formula);
    if (s.table) {
      for (const h of s.table.headers) n += countWords(h);
      for (const row of s.table.rows) for (const c of row) n += countWords(c);
    }
  }
  for (const c of report.conclusions) n += countWords(c);
  return n;
}

function estimatePagesHeuristic(report: ReportJsonV1): number {
  let pages = 0;
  for (const s of report.sections) {
    pages += 0.5;
    for (const p of s.paragraphs ?? []) pages += countWords(p) * 0.0025;
    for (const b of s.bullets ?? []) pages += 0.15;
    if (s.table?.rows?.length) pages += s.table.rows.length * 0.18;
    if (s.formula?.trim()) pages += 0.2;
  }
  for (const _ of report.conclusions) pages += 0.12;
  return pages;
}

function hasNumberedStepsBullets(bullets: string[] | undefined): boolean {
  if (!bullets?.length) return false;
  return bullets.some((b) => /^\s*\d+[\).]\s+/.test(b) || /\bstep\s*\d+/i.test(b));
}

function sectionHasCalcShape(s: ReportSection, requiresCalculation: boolean): boolean {
  if (!requiresCalculation) return true;
  const hasFormula = Boolean(s.formula?.trim());
  const hasTable = Boolean(s.table?.headers?.length && s.table.rows?.length);
  const hasNumBullets = hasNumberedStepsBullets(s.bullets);
  return hasFormula || hasTable || hasNumBullets;
}

function structuralAndLengthGate(report: ReportJsonV1, classification: TaskClassification): boolean {
  const words = wordCountReport(report);
  if (words < FLOOR_WORDS_8_PAGES) return false;

  const shortSections = report.sections.filter((s) => {
    let w = 0;
    for (const p of s.paragraphs ?? []) w += countWords(p);
    for (const b of s.bullets ?? []) w += countWords(b);
    return w < 200 && !s.formula && !s.table?.rows?.length;
  });
  if (shortSections.length > 2) return false;

  if (classification.requiresCalculation) {
    const ok = report.sections.filter((s) => sectionHasCalcShape(s, true)).length;
    const ratio = ok / Math.max(1, report.sections.length);
    if (ratio < 0.6) return false;
  }

  const estPages = estimatePagesHeuristic(report);
  if (estPages < 6 && words < TARGET_WORDS_25_PAGES * 0.5) return false;

  return true;
}

function normalizeSections(
  rawSections: unknown,
  fallbackOutline?: OutlineJsonV1,
  fallbackReport?: ReportJsonV1
) {
  const sectionsSrc = Array.isArray(rawSections) ? rawSections : [];
  const sections = sectionsSrc
    .map((item, idx) => {
      const r = (item && typeof item === "object" ? item : {}) as Record<string, unknown>;
      const fallbackHeading =
        fallbackOutline?.sections[idx]?.heading ||
        fallbackReport?.sections[idx]?.heading ||
        `Section ${idx + 1}`;
      const heading = pickString(r.heading, 300, fallbackHeading);
      const paragraphs = Array.isArray(r.paragraphs)
        ? r.paragraphs
            .map((p) => stripPlaceholders(pickString(p, 4000)))
            .filter(Boolean)
            .slice(0, 40)
        : undefined;
      const bullets = Array.isArray(r.bullets)
        ? r.bullets
            .map((b) => stripPlaceholders(pickString(b, 2000)))
            .filter(Boolean)
            .slice(0, 60)
        : undefined;
      const formula =
        typeof r.formula === "string" ? stripPlaceholders(pickString(r.formula, 2000)) : undefined;
      const tableRaw = (r.table && typeof r.table === "object" ? r.table : undefined) as
        | Record<string, unknown>
        | undefined;
      const table =
        tableRaw && Array.isArray(tableRaw.headers) && Array.isArray(tableRaw.rows)
          ? {
              headers: tableRaw.headers
                .map((h) => stripPlaceholders(pickString(h, 200)))
                .slice(0, 20),
              rows: tableRaw.rows
                .map((row) =>
                  Array.isArray(row)
                    ? row.map((c) => stripPlaceholders(pickString(c, 500))).slice(0, 20)
                    : []
                )
                .slice(0, 50),
            }
          : undefined;

      const out: Record<string, unknown> = { heading };
      if (paragraphs?.length) out.paragraphs = paragraphs;
      if (bullets?.length) out.bullets = bullets;
      if (table && table.headers.length) out.table = table;
      if (formula) out.formula = formula;
      if (!out.paragraphs && !out.bullets && !out.table && !out.formula) {
        const fallbackParagraph =
          stripPlaceholders(
            pickString(
              fallbackOutline?.sections[idx]?.summary ??
                fallbackReport?.sections[idx]?.paragraphs?.[0] ??
                "",
              4000
            )
          ) || "Section details based on provided task data.";
        out.paragraphs = [fallbackParagraph];
      }
      return out;
    })
    .filter((s) => typeof s.heading === "string" && s.heading.length > 0);

  if (sections.length > 0) return sections;
  if (fallbackOutline?.sections?.length) {
    return fallbackOutline.sections.map((s) => ({
      heading: pickString(s.heading, 300, "Section"),
      paragraphs: [pickString(s.summary, 4000, "") || "Section details."],
    }));
  }
  if (fallbackReport?.sections?.length) {
    return fallbackReport.sections.map((s) => ({
      heading: pickString(s.heading, 300, "Section"),
      paragraphs: (s.paragraphs ?? []).map((p) => pickString(p, 4000)).filter(Boolean),
      bullets: (s.bullets ?? []).map((b) => pickString(b, 2000)).filter(Boolean),
      formula: s.formula ? pickString(s.formula, 2000) : undefined,
      table: s.table,
    }));
  }
  return [{ heading: "Main section", paragraphs: ["Generated content."] }];
}

function normalizeConclusions(raw: unknown, fallbackReport?: ReportJsonV1, fallbackOutline?: OutlineJsonV1) {
  const arr = Array.isArray(raw) ? raw : [];
  const cleaned = arr
    .map((c) => stripPlaceholders(pickString(c, 4000)))
    .filter(Boolean)
    .slice(0, 20);
  if (cleaned.length > 0) return cleaned;
  if (fallbackReport?.conclusions?.length) {
    return fallbackReport.conclusions.map((c) => pickString(c, 4000)).filter(Boolean).slice(0, 20);
  }
  if (fallbackOutline?.sections?.length) {
    return fallbackOutline.sections.map((s) => pickString(s.summary, 4000)).filter(Boolean).slice(0, 20);
  }
  return ["Conclusions will be refined based on provided data."];
}

function normalizeReportJson(params: {
  raw: unknown;
  language: TarasLanguage;
  metadata: JobMetadata;
  outline?: OutlineJsonV1;
  fallbackReport?: ReportJsonV1;
  extras?: { partial?: boolean; budgetNotes?: string };
}): ReportJsonV1 {
  const obj = (params.raw && typeof params.raw === "object" ? params.raw : {}) as Record<string, unknown>;
  const md = (obj.metadata && typeof obj.metadata === "object" ? obj.metadata : {}) as Record<
    string,
    unknown
  >;
  const lang =
    obj.language === "uk" || obj.language === "en" || obj.language === "ru"
      ? obj.language
      : params.language;
  const today = new Date().toISOString().slice(0, 10);

  const normalized = {
    schemaVersion: 1 as const,
    language: lang,
    metadata: {
      title: pickString(
        stripPlaceholders(pickString(md.title, 500)),
        500,
        `Lab ${params.metadata.labNumber} — ${params.metadata.topic}`.slice(0, 500)
      ),
      subject: pickString(md.subject, 300, params.metadata.subject),
      labNumber: pickString(md.labNumber, 50, params.metadata.labNumber),
      topic: pickString(md.topic, 500, params.metadata.topic),
      studentName: pickString(md.studentName, 200, params.metadata.studentName),
      group: pickString(md.group, 100, params.metadata.group),
      variant: params.metadata.variant
        ? pickString(md.variant, 100, params.metadata.variant)
        : pickString(md.variant, 100, ""),
      date: pickString(md.date, 100, today),
    },
    sections: normalizeSections(obj.sections, params.outline, params.fallbackReport),
    conclusions: normalizeConclusions(obj.conclusions, params.fallbackReport, params.outline),
  };

  if (!normalized.metadata.variant) {
    delete (normalized.metadata as { variant?: string }).variant;
  }
  const parsed = parseReportJsonV1(normalized);
  const e = params.extras;
  if (!e) return parsed;
  return {
    ...parsed,
    ...(e.partial !== undefined ? { partial: e.partial } : {}),
    ...(e.budgetNotes !== undefined ? { budgetNotes: e.budgetNotes } : {}),
  };
}

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
    maxTokens: 1024,
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

function recordTelemetry(
  hooks: GenerateReportHooks | undefined,
  phase: "classify" | "outline" | "section" | "expand" | "conclusions",
  startedAt: number,
  info: AnthropicCallCompleteInfo,
  extra?: { sectionIndex?: number; sectionHeading?: string }
): void {
  const t = hooks?.telemetry;
  const jobId = hooks?.jobId ?? t?.jobId;
  if (!t || !jobId) return;
  recordAnthropicCall(t, {
    jobId,
    phase,
    startedAt,
    sectionIndex: extra?.sectionIndex,
    sectionHeading: extra?.sectionHeading,
    info,
  });
}

async function classifyTask(params: {
  metaBlock: string;
  language: TarasLanguage;
  budget: JobBudget;
  hooks?: GenerateReportHooks;
}): Promise<TaskClassification> {
  const startedAt = Date.now();
  const raw = await callAnthropicToolJson({
    system: taskClassifierSystemPrompt(params.language),
    messages: [{ role: "user", content: params.metaBlock }],
    tools: [taskClassifierTool],
    toolName: "emit_task_classification",
    parse: (r) => ClassificationSchema.parse(r),
    maxTokens: 1024,
    model: SONNET,
    onCallComplete: (info) => {
      params.budget.recordUsage(info.inputTokens, info.outputTokens);
      recordTelemetry(params.hooks, "classify", startedAt, info);
    },
  });
  return raw;
}

async function callOutline(params: {
  metaBlock: string;
  language: TarasLanguage;
  budget: JobBudget;
  hooks?: GenerateReportHooks;
}): Promise<OutlineJsonV1> {
  const startedAt = Date.now();
  return callAnthropicToolJson({
    system: outlineSystemPrompt(params.language),
    messages: [{ role: "user", content: params.metaBlock }],
    tools: [outlineTool],
    toolName: "emit_outline",
    parse: (raw) => OutlineSchemaV1.parse(raw),
    maxTokens: 8192,
    model: SONNET,
    onCallComplete: (info) => {
      params.budget.recordUsage(info.inputTokens, info.outputTokens);
      recordTelemetry(params.hooks, "outline", startedAt, info);
    },
  });
}

function sectionDepthScore(s: ReportSection): number {
  let score = 0;
  for (const p of s.paragraphs ?? []) score += countWords(p);
  for (const b of s.bullets ?? []) score += countWords(b);
  if (s.formula?.trim()) score += 80;
  if (s.table?.rows?.length) score += 40 + s.table.rows.length * 5;
  return score;
}

function parseSectionTool(raw: unknown): { section: ReportSection; ledgerDelta?: LedgerDelta } {
  const o = SectionToolOutputSchema.parse(raw);
  const section: ReportSection = {
    heading: pickString(o.heading, 300, "Section"),
    paragraphs: o.paragraphs?.map((p) => pickString(p, 4000)).filter(Boolean).slice(0, 40),
    bullets: o.bullets?.map((b) => pickString(b, 2000)).filter(Boolean).slice(0, 60),
    formula: o.formula ? pickString(o.formula, 2000) : undefined,
    table:
      o.table && o.table.headers.length
        ? {
            headers: o.table.headers.map((h) => pickString(h, 200)).slice(0, 20),
            rows: o.table.rows
              .map((row) => row.map((c) => pickString(c, 500)).slice(0, 20))
              .slice(0, 50),
          }
        : undefined,
  };
  if (
    !section.paragraphs?.length &&
    !section.bullets?.length &&
    !section.table?.headers?.length &&
    !section.formula
  ) {
    section.paragraphs = ["(Expanded content.)"];
  }
  return { section, ledgerDelta: o.ledgerDelta as LedgerDelta | undefined };
}

async function generateOneSection(params: {
  metaBlock: string;
  outlineSection: { heading: string; summary: string };
  sectionIndex: number;
  previousHeadings: string[];
  classification: TaskClassification;
  language: TarasLanguage;
  ledgerSnapshot: string;
  mode: "normal" | "expand";
  existingSectionJson?: string;
  budget: JobBudget;
  hooks?: GenerateReportHooks;
}): Promise<{ section: ReportSection; ledgerDelta?: LedgerDelta; had429: boolean }> {
  const playbook = playbookForTaskType(params.classification.taskType);
  const system = sectionWriterSystemPrompt(
    params.language,
    params.classification.taskType,
    params.classification.methodHints,
    params.classification.requiresCalculation,
    playbook
  );
  const prev = params.previousHeadings.length
    ? `Sections already written (headings only):\n${params.previousHeadings.map((h) => `- ${h}`).join("\n")}`
    : "(none yet)";
  const expandNote =
    params.mode === "expand"
      ? `\n\nEXPANSION MODE: Expand the SAME section to at least 700 words of substantive content. Keep the SAME heading. Do not repeat facts already in the facts ledger verbatim; deepen derivations, add missing steps, and improve interpretation.\nExisting section JSON:\n${params.existingSectionJson ?? ""}`
      : "";

  const userContent = `${params.metaBlock}\n\n${prev}\n\nFacts ledger (JSON):\n${params.ledgerSnapshot}\n\nCurrent outline section:\nHeading: ${params.outlineSection.heading}\nGoal: ${params.outlineSection.summary}\n${expandNote}`;

  let had429 = false;
  const startedAt = Date.now();
  const raw = await callAnthropicToolJson({
    system,
    messages: [{ role: "user", content: userContent }],
    tools: [sectionTool],
    toolName: "emit_section",
    parse: (r) => r,
    maxTokens: 8192,
    model: SONNET,
    onCallComplete: (info) => {
      if (info.had429) had429 = true;
      params.budget.recordUsage(info.inputTokens, info.outputTokens);
      recordTelemetry(params.hooks, params.mode === "expand" ? "expand" : "section", startedAt, info, {
        sectionIndex: params.sectionIndex,
        sectionHeading: params.outlineSection.heading,
      });
    },
  });
  const parsed = parseSectionTool(raw);
  if (params.mode === "expand") {
    parsed.section.heading = pickString(params.outlineSection.heading, 300, parsed.section.heading);
  }
  return { ...parsed, had429 };
}

async function generateConclusionsPhase(params: {
  metaBlock: string;
  report: ReportJsonV1;
  ledger: FactsLedger;
  language: TarasLanguage;
  budget: JobBudget;
  hooks?: GenerateReportHooks;
}): Promise<string[]> {
  const startedAt = Date.now();
  const ledgerJson = snapshotForPrompt(params.ledger, 8000);
  const content = `${params.metaBlock}\n\nAssembled report (JSON, may be large):\n${JSON.stringify(
    { metadata: params.report.metadata, sections: params.report.sections },
    null,
    2
  ).slice(0, 24_000)}\n\nFacts ledger (JSON):\n${ledgerJson}`;

  const out = await callAnthropicToolJson({
    system: conclusionsSystemPrompt(params.language),
    messages: [{ role: "user", content }],
    tools: [conclusionsTool],
    toolName: "emit_conclusions",
    parse: (raw) => {
      const o = raw as { conclusions?: unknown };
      const arr = Array.isArray(o.conclusions) ? o.conclusions : [];
      return arr.map((c) => pickString(c, 4000)).filter(Boolean).slice(0, 12);
    },
    maxTokens: 4096,
    model: SONNET,
    onCallComplete: (info) => {
      params.budget.recordUsage(info.inputTokens, info.outputTokens);
      recordTelemetry(params.hooks, "conclusions", startedAt, info);
    },
  });
  return out.length ? out : ["Conclusions derived from the facts ledger and assembled sections."];
}

async function expandWeakestSections(params: {
  metaBlock: string;
  report: ReportJsonV1;
  ledger: FactsLedger;
  classification: TaskClassification;
  language: TarasLanguage;
  budget: JobBudget;
  hooks?: GenerateReportHooks;
}): Promise<{ report: ReportJsonV1; ledger: FactsLedger }> {
  const scored = params.report.sections.map((s, i) => ({ i, s, score: sectionDepthScore(s) }));
  scored.sort((a, b) => a.score - b.score);
  const pick = scored.slice(0, 3);
  let ledger = params.ledger;
  const sections = [...params.report.sections];

  for (const { i, s } of pick) {
    if (params.budget.exhausted()) break;
    const outlineSection = { heading: s.heading, summary: "Expand and deepen this section." };
    const previousHeadings = sections.map((x) => x.heading).filter((_, idx) => idx !== i);
    const snap = snapshotForPrompt(ledger);
    const { section, ledgerDelta } = await generateOneSection({
      metaBlock: params.metaBlock,
      outlineSection,
      sectionIndex: i,
      previousHeadings,
      classification: params.classification,
      language: params.language,
      ledgerSnapshot: snap,
      mode: "expand",
      existingSectionJson: JSON.stringify(s),
      budget: params.budget,
      hooks: params.hooks,
    });
    sections[i] = section;
    ledger = applyDelta(ledger, ledgerDelta, section.heading);
  }

  return {
    report: { ...params.report, sections },
    ledger,
  };
}

function buildTitle(metadata: JobMetadata): string {
  return `Lab ${metadata.labNumber} — ${metadata.topic}`.slice(0, 500);
}

async function generateReportJsonSectioned(params: {
  inputs: TarasInputs;
  templateStyle: TemplateStyle;
  language: TarasLanguage;
  metadata: JobMetadata;
  hooks?: GenerateReportHooks;
}): Promise<ReportJsonV1> {
  const { inputs, templateStyle, language, metadata, hooks } = params;
  const budget = new JobBudget();
  const telemetry = hooks?.telemetry;

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

  const classification = await classifyTask({ metaBlock, language, budget, hooks });
  if (telemetry) telemetry.taskType = classification.taskType;

  const outline = await callOutline({ metaBlock, language, budget, hooks });
  let ledger = initLedger(inputs);

  const outlineSections = outline.sections.slice(0, budget.maxSections);
  const totalOutline = outlineSections.length;
  const sections: ReportSection[] = [];
  let batchSize = 3;
  const todo = [...outlineSections];

  await hooks?.onProgress?.(0, totalOutline);

  while (todo.length && !budget.exhausted()) {
    const n = Math.min(batchSize, todo.length);
    const batch = todo.splice(0, n);
    const ledgerSnapshot = snapshotForPrompt(ledger);
    const results = await Promise.all(
      batch.map((outlineSection, j) =>
        generateOneSection({
          metaBlock,
          outlineSection,
          sectionIndex: sections.length + j,
          previousHeadings: sections.map((s) => s.heading),
          classification,
          language,
          ledgerSnapshot,
          mode: "normal",
          budget,
          hooks,
        })
      )
    );
    let any429 = false;
    for (const r of results) {
      if (r.had429) any429 = true;
      sections.push(r.section);
    }
    if (any429) {
      batchSize = Math.max(1, batchSize - 1);
    }
    const deltas = results.map((r) => r.ledgerDelta);
    ledger = mergeDeltas(ledger, deltas, results.map((r) => r.section.heading));
    await hooks?.renewLease?.();
    await hooks?.onProgress?.(sections.length, totalOutline);
  }

  const today = new Date().toISOString().slice(0, 10);
  let report: ReportJsonV1 = {
    schemaVersion: 1,
    language,
    metadata: {
      title: buildTitle(metadata),
      subject: metadata.subject,
      labNumber: metadata.labNumber,
      topic: metadata.topic,
      studentName: metadata.studentName,
      group: metadata.group,
      ...(metadata.variant ? { variant: metadata.variant } : {}),
      date: today,
    },
    sections,
    conclusions: ["(pending)"],
  };

  let gatePasses = 0;
  let expansionPasses = 0;
  while (
    expansionPasses < budget.maxExpansionPasses &&
    !structuralAndLengthGate(report, classification) &&
    !budget.exhausted()
  ) {
    const expanded = await expandWeakestSections({
      metaBlock,
      report,
      ledger,
      classification,
      language,
      budget,
      hooks,
    });
    report = expanded.report;
    ledger = expanded.ledger;
    expansionPasses += 1;
    gatePasses += 1;
    await hooks?.renewLease?.();
  }

  if (!structuralAndLengthGate(report, classification) && expansionPasses >= budget.maxExpansionPasses) {
    budget.markExpansionsExhausted();
  }

  const conclusions = await generateConclusionsPhase({
    metaBlock,
    report: { ...report, conclusions: [] },
    ledger,
    language,
    budget,
    hooks,
  });
  report = { ...report, conclusions };

  const headers = inputs.measurements.headers.map((h) => h.trim()).filter(Boolean).slice(0, 20);
  const rows = inputs.measurements.rows
    .map((r) => r.map((c) => c.trim()).slice(0, 20))
    .filter((r) => r.some((c) => c.length > 0))
    .slice(0, 50);
  const hasMeasurementData = headers.length > 0 && rows.length > 0;
  const hasAnyTable = report.sections.some((s) => Boolean(s.table?.headers?.length));
  if (hasMeasurementData && !hasAnyTable) {
    const heading =
      language === "uk"
        ? "Вихідні дані задачі"
        : language === "ru"
          ? "Исходные данные задачи"
          : "Input task data";
    const paragraph =
      language === "uk"
        ? "Таблицю нижче сформовано з наданих користувачем даних."
        : language === "ru"
          ? "Таблица ниже сформирована из данных, предоставленных пользователем."
          : "The table below is built from user-provided input data.";
    report.sections = [
      {
        heading,
        paragraphs: [paragraph],
        table: { headers, rows },
      },
      ...report.sections,
    ];
  }

  const partial = budget.exhausted() || !structuralAndLengthGate(report, classification);
  const budgetNotes = partial ? budget.summary() : undefined;

  const normalized = normalizeReportJson({
    raw: report,
    metadata,
    language,
    outline,
    extras: partial ? { partial: true, budgetNotes } : undefined,
  });

  if (telemetry) {
    finalizeJobTelemetry(telemetry, {
      gatePasses,
      expansionPasses,
      finalWordCount: wordCountReport(normalized),
      finalSectionCount: normalized.sections.length,
      estimatedPages: estimatePagesHeuristic(normalized),
      partial: Boolean(normalized.partial),
      budgetHit: budget.hit,
    });
    logJobTelemetrySummary(telemetry);
  }

  return normalized;
}

export async function generateReportJsonLegacy(params: {
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
    model: SONNET,
  });

  const outlineText = JSON.stringify(outline, null, 2);

  const reportRaw = await callAnthropicToolJson({
    system: fullReportSystemPrompt(language),
    messages: [
      {
        role: "user",
        content: `${metaBlock}\n\nApproved outline (JSON):\n${outlineText}`,
      },
    ],
    tools: [reportTool],
    toolName: "emit_report",
    parse: (raw) => raw,
    maxTokens: 12288,
    model: SONNET,
  });

  const normalized = normalizeReportJson({
    raw: reportRaw,
    metadata,
    language,
    outline,
  });

  const headers = inputs.measurements.headers.map((h) => h.trim()).filter(Boolean).slice(0, 20);
  const rows = inputs.measurements.rows
    .map((r) => r.map((c) => c.trim()).slice(0, 20))
    .filter((r) => r.some((c) => c.length > 0))
    .slice(0, 50);
  const hasMeasurementData = headers.length > 0 && rows.length > 0;
  const hasAnyTable = normalized.sections.some((s) => Boolean(s.table?.headers?.length));

  if (hasMeasurementData && !hasAnyTable) {
    const heading =
      language === "uk"
        ? "Вихідні дані задачі"
        : language === "ru"
          ? "Исходные данные задачи"
          : "Input task data";
    const paragraph =
      language === "uk"
        ? "Таблицю нижче сформовано з наданих користувачем даних."
        : language === "ru"
          ? "Таблица ниже сформирована из данных, предоставленных пользователем."
          : "The table below is built from user-provided input data.";
    normalized.sections = [
      {
        heading,
        paragraphs: [paragraph],
        table: { headers, rows },
      },
      ...normalized.sections,
    ];
  }

  return parseReportJsonV1(normalized);
}

export async function generateReportJson(params: {
  inputs: TarasInputs;
  templateStyle: TemplateStyle;
  language: TarasLanguage;
  metadata: JobMetadata;
  hooks?: GenerateReportHooks;
}): Promise<ReportJsonV1> {
  if (!env.useTarasSectionedPipeline) {
    return generateReportJsonLegacy(params);
  }
  return generateReportJsonSectioned(params);
}

export async function refineReportJson(params: {
  report: ReportJsonV1;
  instruction: string;
  language: TarasLanguage;
}): Promise<ReportJsonV1> {
  const instr = sanitizeInstruction(params.instruction, 500);
  const ledger = ledgerFromReport(params.report);
  const block = buildUserPayloadBlock({
    instruction: instr,
    current_report_json: JSON.stringify(params.report),
    facts_ledger_json: snapshotForPrompt(ledger, 8000),
  });

  const refinedRaw = await callAnthropicToolJson({
    system: refineSystemPrompt(params.language),
    messages: [{ role: "user", content: block }],
    tools: [reportTool],
    toolName: "emit_report",
    parse: (raw) => raw,
    maxTokens: 16384,
    model: SONNET,
  });
  return normalizeReportJson({
    raw: refinedRaw,
    language: params.language,
    metadata: {
      subject: params.report.metadata.subject,
      labNumber: params.report.metadata.labNumber,
      topic: params.report.metadata.topic,
      variant: params.report.metadata.variant,
      studentName: params.report.metadata.studentName,
      group: params.report.metadata.group,
    },
    fallbackReport: params.report,
  });
}
