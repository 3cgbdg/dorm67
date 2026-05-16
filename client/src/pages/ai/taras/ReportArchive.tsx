import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { handleAppError } from "@/lib/utils";
import { tarasDeleteJob, tarasListJobs, tarasRenameJob } from "@/lib/tarasApi";
import type { TarasJobSummary } from "@/lib/tarasTypes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Props = {
  activeJobId: string | null;
  onNew: () => void;
  onOpen: (id: string) => void;
  onFork: (id: string) => void;
};

export function ReportArchive({ activeJobId, onNew, onOpen, onFork }: Props) {
  const [jobs, setJobs] = useState<TarasJobSummary[]>([]);
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameTitle, setRenameTitle] = useState("");

  const refresh = useCallback(async () => {
    try {
      const { jobs: list } = await tarasListJobs();
      setJobs(
        (list as Record<string, unknown>[]).map((j) => ({
          id: String(j.id),
          title: j.title as string | undefined,
          status: j.status as string | undefined,
          language: j.language as string | undefined,
          labNumber: j.labNumber as string | undefined,
          topic: j.topic as string | undefined,
          latestRevision: j.latestRevision as number | undefined,
          error: j.error as string | undefined,
        }))
      );
    } catch (e) {
      handleAppError(e, toast);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const t = setInterval(() => void refresh(), 8000);
    return () => clearInterval(t);
  }, [refresh]);

  return (
    <div className="space-y-3 rounded-xl border border-border bg-surface p-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold">Archive</h2>
        <Button size="sm" variant="outline" type="button" onClick={onNew}>
          + New
        </Button>
      </div>
      <ul className="max-h-[50vh] space-y-1 overflow-y-auto text-sm">
        {jobs.map((j) => (
          <li key={j.id}>
            {renameId === j.id ? (
              <div className="flex gap-1">
                <Input
                  value={renameTitle}
                  onChange={(e) => setRenameTitle(e.target.value)}
                  className="h-8 text-xs"
                />
                <Button
                  size="sm"
                  type="button"
                  onClick={async () => {
                    try {
                      await tarasRenameJob(j.id, renameTitle.trim() || "Untitled");
                      setRenameId(null);
                      await refresh();
                    } catch (e) {
                      handleAppError(e, toast);
                    }
                  }}
                >
                  OK
                </Button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => onOpen(j.id)}
                className={cn(
                  "flex w-full flex-col rounded-lg border px-2 py-2 text-left transition-colors",
                  activeJobId === j.id
                    ? "border-brand bg-brand-soft"
                    : "border-transparent hover:bg-surface-2"
                )}
              >
                <span className="truncate font-medium">{j.title || "Untitled"}</span>
                <span className="text-[10px] text-ink-soft">
                  {j.status}
                  {j.latestRevision ? ` · v${j.latestRevision}` : ""}
                </span>
              </button>
            )}
            <div className="mt-1 flex flex-wrap gap-1">
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs"
                type="button"
                onClick={() => {
                  setRenameId(j.id);
                  setRenameTitle(j.title || "");
                }}
              >
                Rename
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs"
                type="button"
                onClick={() => void onFork(j.id)}
              >
                Fork
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs text-danger"
                type="button"
                onClick={async () => {
                  if (!confirm("Delete this report?")) return;
                  try {
                    await tarasDeleteJob(j.id);
                    await refresh();
                  } catch (e) {
                    handleAppError(e, toast);
                  }
                }}
              >
                Delete
              </Button>
            </div>
          </li>
        ))}
      </ul>
      {jobs.length === 0 ? <p className="text-xs text-ink-soft">No reports yet.</p> : null}
    </div>
  );
}
