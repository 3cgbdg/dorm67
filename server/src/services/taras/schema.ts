import { z } from "zod";

export const REPORT_SCHEMA_VERSION = 1 as const;

const boundedString = (max: number) => z.string().max(max);

export const ReportMetadataSchema = z.object({
  title: boundedString(500),
  subject: boundedString(300),
  labNumber: boundedString(50),
  topic: boundedString(500),
  studentName: boundedString(200),
  group: boundedString(100),
  variant: boundedString(100).optional(),
  date: boundedString(100),
});

export const ReportSectionSchema = z.object({
  heading: boundedString(300),
  paragraphs: z.array(boundedString(4000)).max(40).optional(),
  bullets: z.array(boundedString(2000)).max(60).optional(),
  table: z
    .object({
      headers: z.array(boundedString(200)).max(20),
      rows: z.array(z.array(boundedString(500)).max(20)).max(50),
    })
    .optional(),
  formula: boundedString(2000).optional(),
});

export const ReportSchemaV1 = z.object({
  schemaVersion: z.literal(1),
  metadata: ReportMetadataSchema,
  language: z.enum(["uk", "en"]),
  sections: z.array(ReportSectionSchema).min(1).max(40),
  conclusions: z.array(boundedString(4000)).min(1).max(20),
  partial: z.boolean().optional(),
  budgetNotes: boundedString(2000).optional(),
});

export type ReportJsonV1 = z.infer<typeof ReportSchemaV1>;

export function parseReportJsonV1(raw: unknown): ReportJsonV1 {
  return ReportSchemaV1.parse(raw);
}

export { OutlineSchemaV1, type OutlineJsonV1, TemplateStyleSchema, type TemplateStyle } from "./outline.js";
