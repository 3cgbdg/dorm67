import { useEffect, useRef, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { toast } from "sonner";
import { auth, db } from "@/lib/firebase";
import { handleAppError } from "@/lib/utils";
import {
  tarasDocxDownloadUrl,
  tarasFetchJob,
  tarasFetchReportJson,
  tarasGenerate,
  tarasRefine,
  tarasRevertToRevision,
} from "@/lib/tarasApi";
import { reportJsonToHtml } from "@/lib/tarasReportHtml";
import type { TarasInputs, TarasLanguage, TemplateStyle } from "@/lib/tarasTypes";
import type { MetadataState } from "@/pages/ai/taras/StepMetadata";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Props = {
  userId: string;
  jobId: string | null;
  draftId: string | null;
  templateStyle: TemplateStyle | null;
  language: TarasLanguage;
  metadata: MetadataState;
  inputs: TarasInputs;
  templateRefs: string[];
  onJobCreated: (id: string) => void;
  onBack: () => void;
};

type RevisionRow = { revision: number; instruction?: string };

function normalizeRevisions(raw: unknown): RevisionRow[] {
  if (!Array.isArray(raw)) return [];
  const out: RevisionRow[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const r = item as Record<string, unknown>;
    const rev = Number(r.revision);
    if (!Number.isFinite(rev) || rev < 1) continue;
    const instruction = typeof r.instruction === "string" ? r.instruction : undefined;
    out.push({ revision: rev, instruction });
  }
  out.sort((a, b) => a.revision - b.revision);
  return out;
}

function statusLabel(s: string | undefined, progress?: { done?: number; total?: number }) {
  switch (s) {
    case "queued":
      return "Queued…";
    case "generating_outline":
      return "Planning outline…";
    case "generating_sections": {
      const d = progress?.done ?? 0;
      const t = progress?.total ?? 0;
      return t > 0 ? `Writing sections… (${d}/${t})` : "Writing sections…";
    }
    case "generating_full":
      return "Writing report…";
    case "rendering":
      return "Building .docx…";
    case "refining":
      return "Applying edits…";
    case "ready":
      return "Ready";
    case "failed":
      return "Failed";
    default:
      return s ?? "—";
  }
}

export function StepPreview({
  userId,
  jobId,
  draftId,
  templateStyle,
  language,
  metadata,
  inputs,
  templateRefs,
  onJobCreated,
  onBack,
}: Props) {
  const [localJobId, setLocalJobId] = useState<string | null>(jobId);
  const [status, setStatus] = useState<string | undefined>(undefined);
  const [sectionProgress, setSectionProgress] = useState<{ done: number; total: number } | null>(null);
  const [jobWarning, setJobWarning] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [html, setHtml] = useState<string>("");
  const [refineText, setRefineText] = useState("");
  const [busyRefine, setBusyRefine] = useState(false);
  const [revisions, setRevisions] = useState<RevisionRow[]>([]);
  const [latestRevSnap, setLatestRevSnap] = useState(0);
  const [viewingRev, setViewingRev] = useState<number | null>(null);
  const [busyVersion, setBusyVersion] = useState(false);
  const [genKey, setGenKey] = useState(() => crypto.randomUUID());
  const startedGen = useRef(false);

  function mergePartialWarning(rj: Record<string, unknown>) {
    if (rj.partial === true) {
      setJobWarning(
        (prev) =>
          prev ||
          (typeof rj.budgetNotes === "string"
            ? `Generated under budget — review for completeness. ${String(rj.budgetNotes).slice(0, 400)}`
            : "Generated under budget — review for completeness.")
      );
    }
  }

  useEffect(() => {
    setLocalJobId(jobId);
    if (jobId) startedGen.current = true;
  }, [jobId]);

  useEffect(() => {
    if (localJobId || startedGen.current) return;
    if (!draftId || !templateStyle) return;
    startedGen.current = true;
    void (async () => {
      try {
        const idem = genKey;
        const { jobId: newId } = await tarasGenerate({
          inputs,
          templateStyle,
          language,
          metadata: {
            subject: metadata.subject,
            labNumber: metadata.labNumber,
            topic: metadata.topic,
            variant: metadata.variant || undefined,
            studentName: metadata.studentName,
            group: metadata.group,
          },
          draftId,
          templateRefs,
          idempotencyKey: idem,
        });
        setLocalJobId(newId);
        onJobCreated(newId);
      } catch (e) {
        startedGen.current = false;
        handleAppError(e, toast);
      }
    })();
  }, [
    localJobId,
    draftId,
    templateStyle,
    language,
    metadata,
    inputs,
    templateRefs,
    onJobCreated,
    genKey,
  ]);

  useEffect(() => {
    if (!localJobId) return;
    const currentUid = auth.currentUser?.uid;
    if (!currentUid) {
      setError("Session expired. Please sign in again.");
      return;
    }
    const ref = doc(db, "aiTarasJobs", currentUid, "jobs", localJobId);
    const unsub = onSnapshot(
      ref,
      (snap) => {
        const d = snap.data();
        setStatus(d?.status as string | undefined);
        const p = d?.progress as { done?: number; total?: number } | undefined;
        if (p && typeof p.done === "number" && typeof p.total === "number") {
          setSectionProgress({ done: p.done, total: p.total });
        } else {
          setSectionProgress(null);
        }
        setJobWarning(typeof d?.warning === "string" ? d.warning : null);
        setError((d?.error as string) || null);
        setRevisions(normalizeRevisions(d?.revisions));
        const lr = d?.latestRevision;
        setLatestRevSnap(typeof lr === "number" ? lr : Number(lr) || 0);
      },
      (err) => {
        // Prevent uncaught FirebaseError from crashing preview flow.
        console.error("Taras job snapshot failed:", err);
        if (err.code === "permission-denied") {
          setError("Missing Firestore permissions for live job updates. Falling back to API status.");
        } else {
          setError(err.message || "Live status subscription failed.");
        }
        // Best-effort fallback: pull latest snapshot via server API.
        void (async () => {
          try {
            const d = await tarasFetchJob(localJobId);
            setStatus(d?.status as string | undefined);
            const p = d?.progress as { done?: number; total?: number } | undefined;
            if (p && typeof p.done === "number" && typeof p.total === "number") {
              setSectionProgress({ done: p.done, total: p.total });
            } else {
              setSectionProgress(null);
            }
            setJobWarning(typeof d?.warning === "string" ? d.warning : null);
            const apiErr = typeof d?.error === "string" ? d.error : null;
            if (apiErr) setError(apiErr);
            setRevisions(normalizeRevisions(d?.revisions));
            const lr = d?.latestRevision;
            setLatestRevSnap(typeof lr === "number" ? lr : Number(lr) || 0);
          } catch {
            /* ignore fallback failures; UI already has actionable error */
          }
        })();
      }
    );
    return () => unsub();
  }, [localJobId, userId]);

  useEffect(() => {
    if (status !== "ready" || !localJobId) return;
    if (viewingRev != null) return;
    void (async () => {
      try {
        const rj = await tarasFetchReportJson(localJobId);
        setHtml(reportJsonToHtml(rj));
        mergePartialWarning(rj);
      } catch (e) {
        handleAppError(e, toast);
      }
    })();
  }, [status, localJobId, latestRevSnap, viewingRev]);

  async function showLatestPreview() {
    if (!localJobId) return;
    setBusyVersion(true);
    try {
      setViewingRev(null);
      const rj = await tarasFetchReportJson(localJobId);
      setHtml(reportJsonToHtml(rj));
      mergePartialWarning(rj);
    } catch (e) {
      handleAppError(e, toast);
    } finally {
      setBusyVersion(false);
    }
  }

  async function viewRevision(rev: number) {
    if (!localJobId) return;
    setBusyVersion(true);
    try {
      const rj = await tarasFetchReportJson(localJobId, rev);
      setViewingRev(rev);
      setHtml(reportJsonToHtml(rj));
      mergePartialWarning(rj);
    } catch (e) {
      handleAppError(e, toast);
    } finally {
      setBusyVersion(false);
    }
  }

  async function revertToRevision(rev: number) {
    if (!localJobId) return;
    setBusyVersion(true);
    try {
      await tarasRevertToRevision(localJobId, rev);
      setViewingRev(null);
      const rj = await tarasFetchReportJson(localJobId);
      setHtml(reportJsonToHtml(rj));
      mergePartialWarning(rj);
      toast.message(`Restored version ${rev} as latest`);
    } catch (e) {
      handleAppError(e, toast);
    } finally {
      setBusyVersion(false);
    }
  }

  async function downloadDocx() {
    if (!localJobId) return;
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch(tarasDocxDownloadUrl(localJobId), {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error(await res.text());
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `taras-${localJobId}.docx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      handleAppError(e, toast);
    }
  }

  async function sendRefine() {
    if (!localJobId || !refineText.trim()) return;
    setBusyRefine(true);
    try {
      await tarasRefine({
        jobId: localJobId,
        instruction: refineText.trim(),
        idempotencyKey: crypto.randomUUID(),
      });
      setRefineText("");
      toast.message("Refinement queued");
    } catch (e) {
      handleAppError(e, toast);
    } finally {
      setBusyRefine(false);
    }
  }

  return (
    <div className="flex flex-col gap-4 lg:flex-row">
      <div className="min-w-0 flex-1 space-y-3 rounded-xl border border-border bg-surface p-4">
        <div className="text-sm text-ink-soft">
          Status:{" "}
          <span className="font-medium text-ink">{statusLabel(status, sectionProgress ?? undefined)}</span>
        </div>
        {jobWarning && status === "ready" ? (
          <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-900 dark:text-amber-100">
            {jobWarning}
          </div>
        ) : null}
        {status === "ready" && revisions.length > 0 ? (
          <div className="space-y-2 rounded-lg border border-border bg-muted/30 px-3 py-2">
            <div className="text-xs font-medium text-ink">Version history</div>
            {viewingRev != null ? (
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-ink-soft">
                <span>
                  Previewing revision <span className="font-medium text-ink">{viewingRev}</span> (download uses
                  latest).
                </span>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={busyVersion}
                  onClick={() => void showLatestPreview()}
                >
                  Show latest
                </Button>
              </div>
            ) : null}
            <ul className="max-h-40 space-y-1 overflow-y-auto text-xs">
              {[...revisions]
                .sort((a, b) => b.revision - a.revision)
                .map((r) => (
                  <li
                    key={r.revision}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-transparent px-1 py-0.5 hover:border-border"
                  >
                    <span className="min-w-0 text-ink-soft">
                      <span className="font-medium text-ink">v{r.revision}</span>
                      {r.revision === latestRevSnap ? (
                        <span className="ml-1 text-ink-soft">(current)</span>
                      ) : null}
                      {r.instruction ? (
                        <span className="ml-1 truncate text-ink-soft" title={r.instruction}>
                          — {r.instruction}
                        </span>
                      ) : null}
                    </span>
                    <span className="flex shrink-0 gap-1">
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2"
                        disabled={busyVersion || status !== "ready"}
                        onClick={() => void viewRevision(r.revision)}
                      >
                        View
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2"
                        disabled={
                          busyVersion || status !== "ready" || r.revision === latestRevSnap
                        }
                        onClick={() => void revertToRevision(r.revision)}
                      >
                        Revert
                      </Button>
                    </span>
                  </li>
                ))}
            </ul>
          </div>
        ) : null}
        {error ? (
          <div className="rounded-lg border border-danger/40 bg-danger-soft px-3 py-2 text-sm text-danger">
            {error}
            <div className="mt-2">
              <Button
                size="sm"
                variant="outline"
                type="button"
                onClick={() => {
                  setGenKey(crypto.randomUUID());
                  startedGen.current = false;
                  setLocalJobId(null);
                }}
              >
                Retry with new idempotency key
              </Button>
            </div>
          </div>
        ) : null}
        {html ? (
          <div className="prose prose-sm max-w-none dark:prose-invert" dangerouslySetInnerHTML={{ __html: html }} />
        ) : (
          <p className="text-sm text-ink-soft">
            {status === "ready" ? "Loading preview…" : "Preview appears when the job is ready."}
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={onBack}>
            Back
          </Button>
          <Button type="button" disabled={status !== "ready"} onClick={downloadDocx}>
            Download .docx
          </Button>
        </div>
      </div>
      <div className="w-full shrink-0 space-y-3 rounded-xl border border-border bg-surface p-4 lg:w-80">
        <Label className="text-sm font-medium">Refine (uses quota)</Label>
        <Input
          value={refineText}
          onChange={(e) => setRefineText(e.target.value)}
          placeholder="e.g. Shorten conclusions"
          maxLength={500}
        />
        <Button type="button" disabled={!refineText.trim() || status !== "ready" || busyRefine} onClick={sendRefine}>
          {busyRefine ? "Sending…" : "Apply refinement"}
        </Button>
        <p className="text-xs text-ink-soft">
          Refinements run asynchronously. Watch the status above; preview refreshes when ready.
        </p>
      </div>
    </div>
  );
}
