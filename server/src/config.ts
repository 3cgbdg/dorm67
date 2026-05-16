import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const boolish = (v: string | undefined, defaultWhenUnset: boolean) => {
  if (v === undefined || v === "") return defaultWhenUnset;
  return ["1", "true", "yes", "on"].includes(v.toLowerCase());
};

const schema = z.object({
  PORT: z.string().default("8080"),
  CLIENT_ORIGIN: z.string().default("http://localhost:5173"),
  OPENAI_API_KEY: z.string().min(1, "OPENAI_API_KEY is required"),
  ANTHROPIC_API_KEY: z.string().optional(),
  FIREBASE_PROJECT_ID: z.string().min(1, "FIREBASE_PROJECT_ID is required"),
  FIREBASE_CLIENT_EMAIL: z.string().min(1, "FIREBASE_CLIENT_EMAIL is required"),
  FIREBASE_PRIVATE_KEY: z.string().min(1, "FIREBASE_PRIVATE_KEY is required"),
  S3_REGION: z.string().min(1, "S3_REGION is required"),
  S3_BUCKET: z.string().min(1, "S3_BUCKET is required"),
  S3_ACCESS_KEY_ID: z.string().min(1, "S3_ACCESS_KEY_ID is required"),
  S3_SECRET_ACCESS_KEY: z.string().min(1, "S3_SECRET_ACCESS_KEY is required"),
  S3_ENDPOINT: z.string().optional(),
  S3_PUBLIC_BASE_URL: z.string().min(1, "S3_PUBLIC_BASE_URL is required"),
  TARAS_ANTHROPIC_MODEL: z.string().default("claude-sonnet-4-6"),
  TARAS_DISABLE_LIMITS: z
    .string()
    .optional()
    .transform((v) => (v ? ["1", "true", "yes", "on"].includes(v.toLowerCase()) : false)),
  TARAS_USE_SECTIONED: z
    .string()
    .optional()
    .transform((v) => boolish(v, true)),
  TARAS_FORCE_LEGACY: z
    .string()
    .optional()
    .transform((v) => boolish(v, false)),
  TARAS_MAX_TOKENS_PER_JOB: z
    .string()
    .optional()
    .transform((v) => {
      const n = Number(v);
      return Number.isFinite(n) && n > 0 ? Math.floor(n) : 280_000;
    }),
});

const parsed = schema.parse(process.env);

export const env = {
  ...parsed,
  /** New sectioned pipeline unless legacy is forced. */
  useTarasSectionedPipeline: parsed.TARAS_USE_SECTIONED && !parsed.TARAS_FORCE_LEGACY,
};
