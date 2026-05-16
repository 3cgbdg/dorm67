import type { AnthropicCallCompleteInfo } from "../anthropic.js";

export type TelemetryPhase = "classify" | "outline" | "section" | "expand" | "conclusions" | "refine";

export type CallEvent = {
  jobId: string;
  phase: TelemetryPhase;
  sectionIndex?: number;
  sectionHeading?: string;
  model: string;
  startedAt: number;
  durationMs: number;
  inputTokens?: number;
  outputTokens?: number;
  retries: number;
  rateLimitHits: number;
  ok: boolean;
  errorKind?: string;
};

export type BudgetHitKind = "none" | "tokens" | "wallClock" | "sections" | "expansions";

export type JobTelemetry = {
  jobId: string;
  taskType: string;
  longOutputSupported: boolean;
  events: CallEvent[];
  gatePasses: number;
  expansionPasses: number;
  finalWordCount: number;
  finalSectionCount: number;
  estimatedPages: number;
  partial: boolean;
  budgetHit: BudgetHitKind;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalDurationMs: number;
};

export function startJobTelemetry(jobId: string, taskType: string, longOutputSupported: boolean): JobTelemetry {
  return {
    jobId,
    taskType,
    longOutputSupported,
    events: [],
    gatePasses: 0,
    expansionPasses: 0,
    finalWordCount: 0,
    finalSectionCount: 0,
    estimatedPages: 0,
    partial: false,
    budgetHit: "none",
    totalInputTokens: 0,
    totalOutputTokens: 0,
    totalDurationMs: 0,
  };
}

export function recordAnthropicCall(
  telemetry: JobTelemetry,
  params: {
    jobId: string;
    phase: TelemetryPhase;
    sectionIndex?: number;
    sectionHeading?: string;
    startedAt: number;
    info: AnthropicCallCompleteInfo;
  }
): void {
  const ev: CallEvent = {
    jobId: params.jobId,
    phase: params.phase,
    sectionIndex: params.sectionIndex,
    sectionHeading: params.sectionHeading,
    model: params.info.model,
    startedAt: params.startedAt,
    durationMs: params.info.durationMs,
    inputTokens: params.info.inputTokens,
    outputTokens: params.info.outputTokens,
    retries: params.info.retries,
    rateLimitHits: params.info.rateLimitHits,
    ok: params.info.ok,
    errorKind: params.info.errorKind,
  };
  telemetry.events.push(ev);
  if (params.info.ok) {
    telemetry.totalDurationMs += params.info.durationMs;
    telemetry.totalInputTokens += params.info.inputTokens ?? 0;
    telemetry.totalOutputTokens += params.info.outputTokens ?? 0;
  }
}

export function finalizeJobTelemetry(telemetry: JobTelemetry, summary: Partial<JobTelemetry>): JobTelemetry {
  Object.assign(telemetry, summary);
  return telemetry;
}

export function logJobTelemetrySummary(telemetry: JobTelemetry): void {
  // eslint-disable-next-line no-console
  console.info(
    JSON.stringify({
      tag: "taras.job.summary",
      jobId: telemetry.jobId,
      taskType: telemetry.taskType,
      longOutputSupported: telemetry.longOutputSupported,
      gatePasses: telemetry.gatePasses,
      expansionPasses: telemetry.expansionPasses,
      finalWordCount: telemetry.finalWordCount,
      finalSectionCount: telemetry.finalSectionCount,
      estimatedPages: telemetry.estimatedPages,
      partial: telemetry.partial,
      budgetHit: telemetry.budgetHit,
      totalInputTokens: telemetry.totalInputTokens,
      totalOutputTokens: telemetry.totalOutputTokens,
      totalDurationMs: telemetry.totalDurationMs,
      eventCount: telemetry.events.length,
    })
  );
}
