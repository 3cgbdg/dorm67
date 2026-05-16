import { useCallback, useState } from "react";
import { toast } from "sonner";
import { handleAppError } from "@/lib/utils";
import { tarasAnalyzeTemplate, tarasUpload } from "@/lib/tarasApi";
import type { TemplateStyle } from "@/lib/tarasTypes";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

type Props = {
  draftId: string | null;
  templatePaths: string[];
  pastedTemplateText: string;
  onDraftChange: (id: string | null) => void;
  onPathsChange: (paths: string[]) => void;
  onPastedTextChange: (t: string) => void;
  onAnalyzed: (style: TemplateStyle) => void;
};

export function StepTemplate({
  draftId,
  pastedTemplateText,
  onDraftChange,
  onPathsChange,
  onPastedTextChange,
  onAnalyzed,
}: Props) {
  const [busy, setBusy] = useState(false);
  const [files, setFiles] = useState<File[]>([]);

  const onFiles = useCallback((list: FileList | null) => {
    if (!list?.length) return;
    const next = Array.from(list).slice(0, 3);
    setFiles(next);
  }, []);

  async function onNext() {
    if (!files.length) {
      toast.error("Add at least one template image (max 3).");
      return;
    }
    setBusy(true);
    try {
      const { draftId: id, paths } = await tarasUpload(files);
      onDraftChange(id);
      onPathsChange(paths);
      const { templateStyle } = await tarasAnalyzeTemplate({
        draftId: id,
        pastedText: pastedTemplateText || undefined,
      });
      onAnalyzed(templateStyle as TemplateStyle);
    } catch (e) {
      handleAppError(e, toast);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4 rounded-xl border border-border bg-surface p-4">
      <div>
        <Label className="text-sm font-medium">Template images (max 3)</Label>
        <input
          type="file"
          accept="image/*"
          multiple
          className="mt-2 block w-full text-sm"
          onChange={(e) => onFiles(e.target.files)}
        />
        {files.length > 0 ? (
          <p className="mt-2 text-xs text-ink-soft">{files.length} file(s) selected</p>
        ) : null}
      </div>
      <div>
        <Label className="text-sm font-medium">Optional pasted template text</Label>
        <Textarea
          value={pastedTemplateText}
          onChange={(e) => onPastedTextChange(e.target.value)}
          placeholder="Paste headings / structure hints…"
          className="mt-2 min-h-[100px]"
          maxLength={8000}
        />
      </div>
      {draftId ? (
        <p className="text-xs text-ink-soft">Draft id: {draftId}</p>
      ) : null}
      <Button type="button" onClick={onNext} disabled={busy}>
        {busy ? "Analyzing…" : "Analyze & continue"}
      </Button>
    </div>
  );
}
