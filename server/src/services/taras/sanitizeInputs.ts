import { z } from "zod";

export const TarasLanguageSchema = z.enum(["uk", "en", "ru"]);
export type TarasLanguage = z.infer<typeof TarasLanguageSchema>;

const MAX_THEORY = 8000;
const MAX_GOAL = 2000;
const MAX_PROCEDURE = 8000;
const MAX_CONCLUSIONS_HINTS = 4000;
const MAX_TABLE_ROWS = 50;
const MAX_TABLE_COLS = 20;
const MAX_CELL = 500;

export const MeasurementsSchema = z.object({
  headers: z.array(z.string().max(200)).max(MAX_TABLE_COLS),
  rows: z.array(z.array(z.string().max(MAX_CELL)).max(MAX_TABLE_COLS)).max(MAX_TABLE_ROWS),
});

export const TarasInputsSchema = z.object({
  goal: z.string().max(MAX_GOAL),
  theoryNotes: z.string().max(MAX_THEORY),
  procedureNotes: z.string().max(MAX_PROCEDURE),
  measurements: MeasurementsSchema,
  conclusionsHints: z.string().max(MAX_CONCLUSIONS_HINTS),
});

export type TarasInputs = z.infer<typeof TarasInputsSchema>;

const ZW_RE = /[\u200B-\u200D\uFEFF]/g;

export function sanitizeInstruction(raw: string, maxLen: number): string {
  return raw.replace(ZW_RE, "").trim().slice(0, maxLen);
}

export function sanitizeInputs(raw: unknown): TarasInputs {
  const parsed = TarasInputsSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error("Invalid inputs payload");
  }
  const d = parsed.data;
  return {
    goal: d.goal.replace(ZW_RE, "").trim(),
    theoryNotes: d.theoryNotes.replace(ZW_RE, "").trim(),
    procedureNotes: d.procedureNotes.replace(ZW_RE, "").trim(),
    measurements: {
      headers: d.measurements.headers.map((h) => h.replace(ZW_RE, "").trim()),
      rows: d.measurements.rows.map((r) =>
        r.map((c) => c.replace(ZW_RE, "").trim()).slice(0, MAX_TABLE_COLS)
      ),
    },
    conclusionsHints: d.conclusionsHints.replace(ZW_RE, "").trim(),
  };
}

export function inputsToPromptParts(inputs: TarasInputs): Record<string, string> {
  const rows = inputs.measurements.rows.map((r) => r.join("\t")).join("\n");
  const headerLine = inputs.measurements.headers.join("\t");
  return {
    goal: inputs.goal,
    theory: inputs.theoryNotes,
    procedure: inputs.procedureNotes,
    measurements_table: `${headerLine}\n${rows}`,
    conclusions_hints: inputs.conclusionsHints,
  };
}
