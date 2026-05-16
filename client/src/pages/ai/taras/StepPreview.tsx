import { useEffect, useRef, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { toast } from "sonner";
import { auth, db } from "@/lib/firebase";
import { handleAppError } from "@/lib/utils";
import {
  tarasDocxDownloadUrl,
  tarasFetchJob,
  tarasGenerate,
  tarasRefine,
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

function statusLabel(s: string | undefined) {
  switch (s) {
    case "queued":
      return "Queued…";
    case "generating_outline":
      return "Planning outline…";
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
  const [error, setError] = useState<string | null>(null);
  const [html, setHtml] = useState<string>("");
  const [refineText, setRefineText] = useState("");
  const [busyRefine, setBusyRefine] = useState(false);
  const [genKey, setGenKey] = useState(() => crypto.randomUUID());
  const startedGen = useRef(false);

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
    const ref = doc(db, "aiTarasJobs", userId, "jobs", localJobId);
    const unsub = onSnapshot(ref, (snap) => {
      const d = snap.data();
      setStatus(d?.status as string | undefined);
      setError((d?.error as string) || null);
    });
    return () => unsub();
  }, [localJobId, userId]);

  useEffect(() => {
    if (status !== "ready" || !localJobId) return;
    void (async () => {
      try {
        const j = await tarasFetchJob(localJobId);
        const rj = j.reportJson as Record<string, unknown> | null | undefined;
        if (rj) setHtml(reportJsonToHtml(rj));
      } catch (e) {
        handleAppError(e, toast);
      }
    })();
  }, [status, localJobId]);

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
          Status: <span className="font-medium text-ink">{statusLabel(status)}</span>
        </div>
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
