import { createHash, randomUUID } from "node:crypto";
import { Router } from "express";
import multer from "multer";
import { fileTypeFromBuffer } from "file-type";
import sharp from "sharp";
import { z } from "zod";
import type { AuthRequest } from "../middleware/auth.js";
import { admin } from "../firebaseAdmin.js";
import { env } from "../config.js";
import {
  checkTarasRateLimit,
  consumeAiTarasQuota,
  consumeAiTarasWeeklyGenerateQuota,
} from "../services/aiUsage.js";
import { analyzeTemplateFromBuffers } from "../services/taras/generate.js";
import { TemplateStyleSchema } from "../services/taras/outline.js";
import { TarasLanguageSchema, sanitizeInputs } from "../services/taras/sanitizeInputs.js";
import { callAnthropicToolJson, measurementTableTool } from "../services/anthropic.js";
import { deleteFilesWithPrefix, downloadBytes, listPathsWithPrefix, uploadBytes } from "../services/taras/storage.js";
import { assertJobDocSize } from "../services/taras/jobDoc.js";
import { REPORT_SCHEMA_VERSION } from "../services/taras/schema.js";
import { TARAS_PROMPT_VERSION } from "../services/taras/constants.js";
import { measurementsExtractSystemPrompt } from "../services/taras/prompts.js";

export const aiTarasRouter = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { files: 3, fileSize: 5 * 1024 * 1024 },
});

function idempotencyDocId(userId: string, key: string) {
  return createHash("sha256").update(`${userId}:${key}`).digest("hex");
}

const MetadataSchema = z.object({
  subject: z.string().min(1).max(300),
  labNumber: z.string().min(1).max(50),
  topic: z.string().min(1).max(500),
  variant: z.string().max(100).optional(),
  studentName: z.string().min(1).max(200),
  group: z.string().min(1).max(100),
});

const GenerateBodySchema = z.object({
  inputs: z.unknown(),
  templateStyle: z.unknown(),
  language: TarasLanguageSchema,
  metadata: MetadataSchema,
  draftId: z.string().min(1).max(120),
  templateRefs: z.array(z.string().max(500)).max(5),
  idempotencyKey: z.string().min(8).max(200),
});

const RefineBodySchema = z.object({
  jobId: z.string().min(1),
  instruction: z.string().min(1).max(500),
  idempotencyKey: z.string().min(8).max(200),
});

const AnalyzeBodySchema = z.object({
  draftId: z.string().min(1).max(120),
  pastedText: z.string().max(8000).optional(),
});

const ExtractMeasurementsBodySchema = z.object({
  draftId: z.string().min(1).max(120),
  pastedText: z.string().max(12000).optional(),
  highQuality: z.boolean().optional(),
});

aiTarasRouter.post("/upload", upload.array("files", 3), async (req: AuthRequest, res) => {
  const userId = req.userId!;
  const files = req.files as Express.Multer.File[] | undefined;
  if (!files?.length) {
    res.status(400).json({ error: "No files" });
    return;
  }

  const draftId = randomUUID();
  const paths: string[] = [];

  try {
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      const detected = await fileTypeFromBuffer(f.buffer);
      if (!detected || !detected.mime.startsWith("image/")) {
        res.status(400).json({ error: "Only image uploads are allowed" });
        return;
      }
      const img = sharp(f.buffer).rotate();
      const meta = await img.metadata();
      if ((meta.width ?? 0) > 4000 || (meta.height ?? 0) > 4000) {
        res.status(400).json({ error: "Image dimensions too large" });
        return;
      }
      const resized = await img
        .resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
        .toBuffer();
      const ext = detected.ext === "png" ? "png" : "jpg";
      const path = `aiTaras/${userId}/drafts/${draftId}/${i}.${ext}`;
      await uploadBytes(path, resized, detected.mime);
      paths.push(path);
    }
    res.json({ draftId, paths });
  } catch (e) {
    console.error("Taras upload error:", e);
    res.status(500).json({ error: "Upload failed" });
  }
});

aiTarasRouter.post("/template-analyze", async (req: AuthRequest, res) => {
  if (!env.ANTHROPIC_API_KEY) {
    res.status(503).json({ error: "Taras is not configured (ANTHROPIC_API_KEY)" });
    return;
  }
  const userId = req.userId!;
  const parsed = AnalyzeBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid body", details: parsed.error.flatten() });
    return;
  }
  const { draftId, pastedText } = parsed.data;

  try {
    if (!env.TARAS_DISABLE_LIMITS) {
      const okRate = await checkTarasRateLimit(userId);
      if (!okRate) {
        res.status(429).json({ error: "Too many requests. Try again in a minute." });
        return;
      }
    }

    const draftKeys = await listPathsWithPrefix(`aiTaras/${userId}/drafts/${draftId}/`);
    if (!draftKeys.length) {
      res.status(400).json({ error: "Draft not found or empty" });
      return;
    }

    const buffers: Buffer[] = [];
    const mediaTypes: string[] = [];
    for (const key of draftKeys) {
      const buf = await downloadBytes(key);
      const ft = await fileTypeFromBuffer(buf);
      if (!ft?.mime.startsWith("image/")) continue;
      buffers.push(buf);
      mediaTypes.push(ft.mime);
    }
    if (!buffers.length) {
      res.status(400).json({ error: "No valid images in draft" });
      return;
    }

    const style = await analyzeTemplateFromBuffers({
      imageBuffers: buffers,
      mediaTypes,
      pastedText,
    });
    res.json({ templateStyle: style });
  } catch (e) {
    console.error("template-analyze:", e);
    res.status(500).json({ error: e instanceof Error ? e.message : "Analyze failed" });
  }
});

aiTarasRouter.post("/extract-measurements", async (req: AuthRequest, res) => {
  if (!env.ANTHROPIC_API_KEY) {
    res.status(503).json({ error: "Taras is not configured (ANTHROPIC_API_KEY)" });
    return;
  }
  const userId = req.userId!;
  const parsed = ExtractMeasurementsBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid body", details: parsed.error.flatten() });
    return;
  }
  const { draftId, pastedText, highQuality } = parsed.data;

  try {
    if (!env.TARAS_DISABLE_LIMITS) {
      const okRate = await checkTarasRateLimit(userId);
      if (!okRate) {
        res.status(429).json({ error: "Too many requests. Try again in a minute." });
        return;
      }
    }

    const draftKeys = await listPathsWithPrefix(`aiTaras/${userId}/drafts/${draftId}/`);
    const buffers: Buffer[] = [];
    const mediaTypes: string[] = [];
    for (const key of draftKeys) {
      const buf = await downloadBytes(key);
      const ft = await fileTypeFromBuffer(buf);
      if (!ft?.mime.startsWith("image/")) continue;
      buffers.push(buf);
      mediaTypes.push(ft.mime);
    }

    const content: Array<
      | { type: "text"; text: string }
      | {
          type: "image";
          source: {
            type: "base64";
            media_type: "image/jpeg" | "image/png" | "image/gif" | "image/webp";
            data: string;
          };
        }
    > = [];
    for (let i = 0; i < buffers.length; i++) {
      content.push({
        type: "image",
        source: {
          type: "base64",
          media_type: (mediaTypes[i] || "image/jpeg") as "image/jpeg" | "image/png" | "image/gif" | "image/webp",
          data: buffers[i].toString("base64"),
        },
      });
    }
    content.push({
      type: "text",
      text: `Extract measurements table from this task.\n${
        pastedText ? `Task text hints:\n${pastedText}` : "No pasted text provided."
      }`,
    });

    const parsedTable = await callAnthropicToolJson({
      system: measurementsExtractSystemPrompt(),
      messages: [{ role: "user", content }],
      tools: [measurementTableTool],
      toolName: "emit_measurements_table",
      parse: (raw) => {
        const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
        const headers = Array.isArray(r.headers)
          ? r.headers.map((h) => String(h || "").trim()).filter(Boolean).slice(0, 20)
          : [];
        const rows = Array.isArray(r.rows)
          ? r.rows
              .map((row) =>
                Array.isArray(row) ? row.map((c) => String(c ?? "").trim()).slice(0, 20) : []
              )
              .slice(0, 50)
          : [];
        const confidence = typeof r.confidence === "number" ? r.confidence : undefined;
        const notes = typeof r.notes === "string" ? r.notes : "";
        return { headers, rows, confidence, notes };
      },
      maxTokens: 2048,
      model: highQuality ? "claude-sonnet-4-6" : undefined,
    });

    res.json({ table: parsedTable });
  } catch (e) {
    console.error("extract-measurements:", e);
    res.status(500).json({ error: e instanceof Error ? e.message : "Extraction failed" });
  }
});

aiTarasRouter.post("/generate", async (req: AuthRequest, res) => {
  const userId = req.userId!;
  if (!env.ANTHROPIC_API_KEY) {
    res.status(503).json({ error: "Taras is not configured" });
    return;
  }

  const parsed = GenerateBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid body", details: parsed.error.flatten() });
    return;
  }

  const { inputs, templateStyle, language, metadata, draftId, templateRefs, idempotencyKey } =
    parsed.data;

  const idemId = idempotencyDocId(userId, idempotencyKey);
  const idemRef = admin.firestore().collection("aiTarasIdempotency").doc(idemId);
  const existing = await idemRef.get();
  if (existing.exists) {
    const d = existing.data();
    if (d?.userId === userId && d?.jobId) {
      res.json({ jobId: d.jobId as string, deduped: true });
      return;
    }
  }

  if (!env.TARAS_DISABLE_LIMITS) {
    const okRate = await checkTarasRateLimit(userId);
    if (!okRate) {
      res.status(429).json({ error: "Too many requests. Try again in a minute." });
      return;
    }

    const weekly = await consumeAiTarasWeeklyGenerateQuota(userId);
    if (!weekly.allowed) {
      res.status(429).json({
        error: "Weekly Taras generation limit reached (1 per week)",
        ...weekly,
      });
      return;
    }

    const quota = await consumeAiTarasQuota(userId, 1.0);
    if (!quota.allowed) {
      res.status(429).json({ error: "Taras quota exceeded", ...quota });
      return;
    }
  }

  let sanitized;
  try {
    sanitized = sanitizeInputs(inputs);
  } catch {
    res.status(400).json({ error: "Invalid inputs" });
    return;
  }

  let styleParsed;
  try {
    styleParsed = TemplateStyleSchema.parse(templateStyle);
  } catch {
    res.status(400).json({ error: "Invalid templateStyle" });
    return;
  }

  const jobsCol = admin.firestore().collection("aiTarasJobs").doc(userId).collection("jobs");
  const jobRef = jobsCol.doc();
  const jobId = jobRef.id;

  const jobPayload: Record<string, unknown> = {
    ownerUid: userId,
    idempotencyKey,
    title: `Lab ${metadata.labNumber} — ${metadata.topic}`.slice(0, 500),
    subject: metadata.subject,
    labNumber: metadata.labNumber,
    topic: metadata.topic,
    language,
    variant: metadata.variant ?? "",
    studentName: metadata.studentName,
    group: metadata.group,
    status: "queued",
    draftId,
    templateRefs,
    templateStyle: styleParsed,
    // Firestore rejects nested arrays; persist canonical JSON string.
    inputsJson: JSON.stringify(sanitized),
    metadata,
    latestRevision: 0,
    latestReportPath: "",
    docxPath: "",
    revisions: [],
    modelId: env.TARAS_ANTHROPIC_MODEL,
    promptVersion: TARAS_PROMPT_VERSION,
    schemaVersion: REPORT_SCHEMA_VERSION,
    retryCount: 0,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  try {
    assertJobDocSize(jobPayload as Record<string, unknown>);
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : "Payload too large" });
    return;
  }

  const batch = admin.firestore().batch();
  batch.set(jobRef, jobPayload);
  batch.set(idemRef, {
    userId,
    jobId,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  await batch.commit();

  res.json({ jobId });
});

aiTarasRouter.post("/refine", async (req: AuthRequest, res) => {
  const userId = req.userId!;
  if (!env.ANTHROPIC_API_KEY) {
    res.status(503).json({ error: "Taras is not configured" });
    return;
  }

  const parsed = RefineBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid body", details: parsed.error.flatten() });
    return;
  }

  const { jobId, instruction, idempotencyKey } = parsed.data;
  const idemId = idempotencyDocId(userId, `refine:${idempotencyKey}`);
  const idemRef = admin.firestore().collection("aiTarasIdempotency").doc(idemId);
  const existing = await idemRef.get();
  if (existing.exists && existing.data()?.userId === userId) {
    res.json({ jobId: existing.data()?.jobId as string, deduped: true });
    return;
  }

  const jobRef = admin.firestore().collection("aiTarasJobs").doc(userId).collection("jobs").doc(jobId);
  const snap = await jobRef.get();
  if (!snap.exists || (snap.data() as { ownerUid?: string }).ownerUid !== userId) {
    res.status(404).json({ error: "Job not found" });
    return;
  }
  const jobStatus = (snap.data() as { status?: string }).status;
  if (jobStatus !== "ready") {
    res.status(400).json({ error: "Job must be ready before refinement" });
    return;
  }

  if (!env.TARAS_DISABLE_LIMITS) {
    const okRate = await checkTarasRateLimit(userId);
    if (!okRate) {
      res.status(429).json({ error: "Too many requests" });
      return;
    }

    const quota = await consumeAiTarasQuota(userId, 0.2);
    if (!quota.allowed) {
      res.status(429).json({ error: "Taras quota exceeded", ...quota });
      return;
    }
  }

  const batch = admin.firestore().batch();
  batch.update(jobRef, {
    status: "refining",
    pendingInstruction: instruction,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  batch.set(idemRef, {
    userId,
    jobId,
    kind: "refine",
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  await batch.commit();

  res.json({ jobId });
});

type RevisionEntry = {
  revision?: number;
  reportPath?: string;
  docxPath?: string;
  instruction?: string;
};

function findRevisionPaths(
  data: Record<string, unknown>,
  revision: number
): { reportPath: string; docxPath: string } | null {
  const revs = data.revisions as RevisionEntry[] | undefined;
  if (!revs?.length) return null;
  const hit = revs.find((r) => Number(r.revision) === revision);
  if (hit?.reportPath && hit?.docxPath) {
    return { reportPath: hit.reportPath, docxPath: hit.docxPath };
  }
  return null;
}

aiTarasRouter.get("/jobs/:id/report-json", async (req: AuthRequest, res) => {
  const userId = req.userId!;
  const jobId = String(req.params.id);
  const ref = admin.firestore().collection("aiTarasJobs").doc(userId).collection("jobs").doc(jobId);
  const snap = await ref.get();
  if (!snap.exists) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const data = snap.data() as Record<string, unknown>;
  if (data.ownerUid !== userId) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  const rawRev = req.query.revision;
  let reportPath: string | undefined;
  if (rawRev === undefined || rawRev === "") {
    reportPath = data.latestReportPath as string | undefined;
  } else {
    const revision = Number(rawRev);
    if (!Number.isFinite(revision) || revision < 1) {
      res.status(400).json({ error: "Invalid revision" });
      return;
    }
    const found = findRevisionPaths(data, revision);
    if (!found) {
      res.status(404).json({ error: "Revision not found" });
      return;
    }
    reportPath = found.reportPath;
  }

  if (!reportPath) {
    res.status(404).json({ error: "No report data" });
    return;
  }

  const buf = await downloadBytes(reportPath);
  const json = JSON.parse(buf.toString("utf8"));
  res.json(json);
});

aiTarasRouter.post("/jobs/:id/revert", async (req: AuthRequest, res) => {
  const userId = req.userId!;
  const jobId = String(req.params.id);
  const RevertSchema = z.object({ revision: z.number().int().positive() });
  const parsed = RevertSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid body", details: parsed.error.flatten() });
    return;
  }

  const ref = admin.firestore().collection("aiTarasJobs").doc(userId).collection("jobs").doc(jobId);
  const snap = await ref.get();
  if (!snap.exists) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const data = snap.data() as Record<string, unknown>;
  if (data.ownerUid !== userId) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  if (data.status !== "ready") {
    res.status(400).json({ error: "Job must be ready to revert" });
    return;
  }

  const found = findRevisionPaths(data, parsed.data.revision);
  if (!found) {
    res.status(404).json({ error: "Revision not found" });
    return;
  }

  await ref.update({
    latestRevision: parsed.data.revision,
    latestReportPath: found.reportPath,
    docxPath: found.docxPath,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  res.json({ ok: true });
});

aiTarasRouter.get("/jobs", async (req: AuthRequest, res) => {
  const userId = req.userId!;
  const limit = Math.min(Number(req.query.limit) || 20, 50);
  const snap = await admin
    .firestore()
    .collection("aiTarasJobs")
    .doc(userId)
    .collection("jobs")
    .orderBy("createdAt", "desc")
    .limit(limit)
    .get();

  const jobs = snap.docs.map((d) => {
    const x = d.data();
    return {
      id: d.id,
      title: x.title,
      status: x.status,
      language: x.language,
      labNumber: x.labNumber,
      topic: x.topic,
      latestRevision: x.latestRevision,
      createdAt: x.createdAt,
      updatedAt: x.updatedAt,
      error: x.error,
    };
  });
  res.json({ jobs });
});

aiTarasRouter.get("/jobs/:id", async (req: AuthRequest, res) => {
  const userId = req.userId!;
  const jobId = String(req.params.id);
  const ref = admin.firestore().collection("aiTarasJobs").doc(userId).collection("jobs").doc(jobId);
  const snap = await ref.get();
  if (!snap.exists) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const data = snap.data() as Record<string, unknown>;
  if (data.ownerUid !== userId) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  let reportJson: unknown = null;
  const reportPath = data.latestReportPath as string | undefined;
  if (reportPath && data.status === "ready") {
    const buf = await downloadBytes(reportPath);
    reportJson = JSON.parse(buf.toString("utf8"));
  }

  res.json({
    id: jobId,
    ...data,
    reportJson,
  });
});

aiTarasRouter.get("/jobs/:id/docx", async (req: AuthRequest, res) => {
  const userId = req.userId!;
  const jobId = String(req.params.id);
  const ref = admin.firestore().collection("aiTarasJobs").doc(userId).collection("jobs").doc(jobId);
  const snap = await ref.get();
  if (!snap.exists) {
    res.status(404).end();
    return;
  }
  const data = snap.data() as Record<string, unknown>;
  if (data.ownerUid !== userId) {
    res.status(404).end();
    return;
  }
  const docxPath = data.docxPath as string | undefined;
  if (!docxPath) {
    res.status(404).json({ error: "No document yet" });
    return;
  }
  const buf = await downloadBytes(docxPath);
  const safeName = `taras-${jobId}.docx`;
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
  res.setHeader("Content-Disposition", `attachment; filename="${safeName}"`);
  res.setHeader("Cache-Control", "private, no-store");
  res.send(buf);
});

aiTarasRouter.delete("/jobs/:id", async (req: AuthRequest, res) => {
  const userId = req.userId!;
  const jobId = String(req.params.id);
  const ref = admin.firestore().collection("aiTarasJobs").doc(userId).collection("jobs").doc(jobId);
  const snap = await ref.get();
  if (!snap.exists) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const data = snap.data() as Record<string, unknown>;
  if (data.ownerUid !== userId) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const draftId = data.draftId as string | undefined;
  await deleteFilesWithPrefix(`aiTaras/${userId}/jobs/${jobId}/`);
  if (draftId) {
    await deleteFilesWithPrefix(`aiTaras/${userId}/drafts/${draftId}/`);
  }
  await ref.delete();
  res.json({ ok: true });
});

aiTarasRouter.patch("/jobs/:id", async (req: AuthRequest, res) => {
  const userId = req.userId!;
  const jobId = String(req.params.id);
  const TitleSchema = z.object({ title: z.string().min(1).max(500) });
  const parsed = TitleSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid body" });
    return;
  }
  const ref = admin.firestore().collection("aiTarasJobs").doc(userId).collection("jobs").doc(jobId);
  const snap = await ref.get();
  if (!snap.exists || (snap.data() as { ownerUid?: string }).ownerUid !== userId) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  await ref.update({
    title: parsed.data.title,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  res.json({ ok: true });
});
