import { randomUUID } from "node:crypto";
import { admin } from "../firebaseAdmin.js";
import { env } from "../config.js";
import {
  generateReportJson,
  refineReportJson,
  type GenerateReportHooks,
  type JobMetadata,
} from "./taras/generate.js";
import type { TemplateStyle } from "./taras/outline.js";
import type { TarasLanguage } from "./taras/sanitizeInputs.js";
import { sanitizeInputs } from "./taras/sanitizeInputs.js";
import { parseReportJsonV1 } from "./taras/schema.js";
import { renderDocx } from "./taras/renderDocx.js";
import { uploadBytes, downloadBytes } from "./taras/storage.js";
import { probeAnthropicLongOutput, isLongOutputSupported } from "./anthropic.js";
import { startJobTelemetry } from "./taras/telemetry.js";

const INSTANCE_ID = randomUUID();
const LEASE_MS = 30 * 60 * 1000;

let activeLeaseRef: FirebaseFirestore.DocumentReference | null = null;

function isFirestoreNotFound(err: unknown): boolean {
  return Boolean(err && typeof err === "object" && (err as { code?: unknown }).code === 5);
}

function isFirestoreFailedPrecondition(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const code = (err as { code?: unknown }).code;
  const msg = String((err as { message?: unknown }).message || "").toUpperCase();
  return code === 9 || msg.includes("FAILED_PRECONDITION");
}

function bucketPathForJob(userId: string, jobId: string, kind: "report" | "docx", rev: number) {
  const ext = kind === "report" ? "json" : "docx";
  return `aiTaras/${userId}/jobs/${jobId}/${kind}-v${rev}.${ext}`;
}

async function tryAcquireLease(
  ref: FirebaseFirestore.DocumentReference
): Promise<boolean> {
  const now = Date.now();
  return admin.firestore().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) return false;
    const d = snap.data() as Record<string, unknown>;
    const status = d.status as string;
    if (status !== "queued" && status !== "refining") return false;
    const lease = d.lease as { expiresAt?: FirebaseFirestore.Timestamp } | undefined;
    const exp = lease?.expiresAt?.toMillis?.() ?? 0;
    if (exp > now) return false;

    tx.update(ref, {
      lease: {
        owner: INSTANCE_ID,
        expiresAt: admin.firestore.Timestamp.fromMillis(now + LEASE_MS),
      },
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return true;
  });
}

async function processQueuedJob(
  userId: string,
  jobId: string,
  ref: FirebaseFirestore.DocumentReference
) {
  const snap = await ref.get();
  if (!snap.exists) return;
  const d = snap.data() as Record<string, unknown>;
  const inputsRaw = typeof d.inputsJson === "string" ? JSON.parse(d.inputsJson) : d.inputs;
  const inputs = sanitizeInputs(inputsRaw);
  const templateStyle = d.templateStyle as TemplateStyle;
  const language = d.language as TarasLanguage;
  const metadata = d.metadata as JobMetadata;

  await ref.update({
    status: "generating_outline",
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  const telemetry = startJobTelemetry(jobId, "pending", isLongOutputSupported());

  const hooks: GenerateReportHooks = {
    jobId,
    telemetry,
    renewLease: async () => {
      await ref.update({
        "lease.expiresAt": admin.firestore.Timestamp.fromMillis(Date.now() + LEASE_MS),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    },
    onProgress: async (done, total) => {
      await ref.update({
        status: "generating_sections",
        progress: { done, total },
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    },
  };

  const report = await generateReportJson({
    inputs,
    templateStyle,
    language,
    metadata,
    hooks,
  });

  await ref.update({
    status: "rendering",
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  const bufJson = Buffer.from(JSON.stringify(report, null, 2), "utf8");
  const docx = await renderDocx(report);
  const rev = 1;
  const reportPath = bucketPathForJob(userId, jobId, "report", rev);
  const docxPath = bucketPathForJob(userId, jobId, "docx", rev);

  await uploadBytes(reportPath, bufJson, "application/json");
  await uploadBytes(
    docxPath,
    docx,
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  );

  const revisionEntry = {
    revision: rev,
    reportPath,
    docxPath,
    createdAt: admin.firestore.Timestamp.now(),
  };

  const jobUpdate: Record<string, unknown> = {
    status: "ready",
    latestRevision: rev,
    latestReportPath: reportPath,
    docxPath,
    revisions: admin.firestore.FieldValue.arrayUnion(revisionEntry),
    lease: admin.firestore.FieldValue.delete(),
    retryCount: 0,
    error: admin.firestore.FieldValue.delete(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  if (report.partial) {
    jobUpdate.warning =
      "Generated within budget caps; some sections may be shorter than target. Review for completeness.";
    if (report.budgetNotes) jobUpdate.budgetNotes = report.budgetNotes;
  } else {
    jobUpdate.warning = admin.firestore.FieldValue.delete();
    jobUpdate.budgetNotes = admin.firestore.FieldValue.delete();
  }

  await ref.update(jobUpdate);
}

async function processRefiningJob(
  userId: string,
  jobId: string,
  ref: FirebaseFirestore.DocumentReference
) {
  const snap = await ref.get();
  if (!snap.exists) return;
  const d = snap.data() as Record<string, unknown>;
  const language = d.language as TarasLanguage;
  const instruction = String(d.pendingInstruction || "");
  const latestPath = d.latestReportPath as string;
  const prevRev = Number(d.latestRevision || 0);
  if (!latestPath || !instruction) {
    throw new Error("Missing refinement context");
  }

  const rawJson = await downloadBytes(latestPath);
  const report = parseReportJsonV1(JSON.parse(rawJson.toString("utf8")));

  await ref.update({
    status: "generating_full",
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  const next = await refineReportJson({ report, instruction, language });

  const rev = prevRev + 1;
  const reportPath = bucketPathForJob(userId, jobId, "report", rev);
  const docxPath = bucketPathForJob(userId, jobId, "docx", rev);
  const bufJson = Buffer.from(JSON.stringify(next, null, 2), "utf8");
  const docx = await renderDocx(next);

  await ref.update({
    status: "rendering",
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  await uploadBytes(reportPath, bufJson, "application/json");
  await uploadBytes(
    docxPath,
    docx,
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  );

  const revisionEntry = {
    revision: rev,
    reportPath,
    docxPath,
    instruction,
    createdAt: admin.firestore.Timestamp.now(),
  };

  const jobUpdate: Record<string, unknown> = {
    status: "ready",
    latestRevision: rev,
    latestReportPath: reportPath,
    docxPath,
    revisions: admin.firestore.FieldValue.arrayUnion(revisionEntry),
    pendingInstruction: admin.firestore.FieldValue.delete(),
    lease: admin.firestore.FieldValue.delete(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  if (next.partial) {
    jobUpdate.warning =
      "Generated within budget caps; some sections may be shorter than target. Review for completeness.";
    if (next.budgetNotes) jobUpdate.budgetNotes = next.budgetNotes;
  } else {
    jobUpdate.warning = admin.firestore.FieldValue.delete();
    jobUpdate.budgetNotes = admin.firestore.FieldValue.delete();
  }

  await ref.update(jobUpdate);
}

async function handleJobDoc(
  ref: FirebaseFirestore.DocumentReference,
  snap: FirebaseFirestore.DocumentSnapshot
) {
  const d = snap.data() as Record<string, unknown> | undefined;
  if (!d) return;
  const userId = d.ownerUid as string;
  const jobId = snap.id;
  const status = d.status as string;

  if (status !== "queued" && status !== "refining") return;

  const acquired = await tryAcquireLease(ref);
  if (!acquired) return;

  activeLeaseRef = ref;

  try {
    if (status === "queued") {
      await processQueuedJob(userId, jobId, ref);
    } else {
      await processRefiningJob(userId, jobId, ref);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Taras job failed";
    try {
      await ref.update({
        status: "failed",
        error: msg,
        lease: admin.firestore.FieldValue.delete(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    } catch (updateErr) {
      if (!isFirestoreNotFound(updateErr)) throw updateErr;
    }
  }
}

export async function startTarasQueueListenerAsync(): Promise<void> {
  if (!env.ANTHROPIC_API_KEY) {
    // eslint-disable-next-line no-console
    console.warn("Taras queue disabled: ANTHROPIC_API_KEY not set.");
    return;
  }
  await probeAnthropicLongOutput();

  // eslint-disable-next-line no-console
  console.log("Taras queue listener started", INSTANCE_ID);

  admin
    .firestore()
    .collectionGroup("jobs")
    .where("status", "in", ["queued", "refining"])
    .onSnapshot(
      (snapshot) => {
        for (const change of snapshot.docChanges()) {
          if (change.type === "removed") continue;
          const ref = change.doc.ref;
          void handleJobDoc(ref, change.doc);
        }
      },
      (err) => {
        // eslint-disable-next-line no-console
        console.error("Taras queue snapshot error:", err);
      }
    );

  setInterval(() => {
    void (async () => {
      if (!activeLeaseRef) return;
      try {
        await activeLeaseRef.update({
          "lease.expiresAt": admin.firestore.Timestamp.fromMillis(Date.now() + LEASE_MS),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      } catch {
        /* ignore */
      }
    })();
  }, 30_000);

  setInterval(() => {
    void (async () => {
      try {
        const stuck = await admin
          .firestore()
          .collectionGroup("jobs")
          .where("status", "in", [
            "generating_outline",
            "generating_sections",
            "generating_full",
            "rendering",
            "refining",
          ])
          .limit(25)
          .get();

        for (const doc of stuck.docs) {
          try {
            const d = doc.data() as Record<string, unknown>;
            const lease = d.lease as { expiresAt?: FirebaseFirestore.Timestamp } | undefined;
            const exp = lease?.expiresAt?.toMillis?.() ?? 0;
            if (exp > Date.now()) continue;
            const retries = Number(d.retryCount || 0);
            if (retries >= 3) {
              await doc.ref.update({
                status: "failed",
                error: "Job stalled after multiple retries",
                lease: admin.firestore.FieldValue.delete(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
              });
              continue;
            }
            const prevStatus = d.status as string;
            await doc.ref.update({
              status: prevStatus === "refining" ? "refining" : "queued",
              lease: admin.firestore.FieldValue.delete(),
              retryCount: retries + 1,
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
          } catch (err) {
            if (!isFirestoreNotFound(err)) throw err;
          }
        }
      } catch (err) {
        if (isFirestoreFailedPrecondition(err)) {
          // eslint-disable-next-line no-console
          console.warn("Taras stalled-jobs poll waiting on Firestore index build...");
          return;
        }
        // eslint-disable-next-line no-console
        console.error("Taras stalled-jobs poll error:", err);
      }
    })();
  }, 60_000);
}

export function startTarasQueueListener() {
  void startTarasQueueListenerAsync();
}
