import { z } from "zod";

/** Outline produced before full report generation (stage 1). */
export const OutlineSectionSchema = z.object({
  heading: z.string().max(300),
  summary: z.string().max(1200),
});

export const OutlineSchemaV1 = z.object({
  schemaVersion: z.literal(1),
  sections: z.array(OutlineSectionSchema).min(1).max(40),
});

export type OutlineJsonV1 = z.infer<typeof OutlineSchemaV1>;

export const TemplateStyleSchema = z
  .object({
    inferredLanguage: z.enum(["uk", "en", "ru", "unknown"]).optional(),
    hasTable: z.boolean().optional(),
    headingStyle: z.string().max(200).optional(),
    register: z.enum(["formal", "neutral", "unknown"]).optional(),
    notes: z.string().max(2000).optional(),
  })
  .passthrough();

export type TemplateStyle = z.infer<typeof TemplateStyleSchema>;
