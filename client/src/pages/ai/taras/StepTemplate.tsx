import { useCallback, useEffect, useMemo, useState } from "react";
import { ImagePlus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { handleAppError } from "@/lib/utils";
import { tarasAnalyzeTemplate, tarasUpload } from "@/lib/tarasApi";
import type { TemplateStyle } from "@/lib/tarasTypes";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/ui/field";
import { Card, CardContent } from "@/components/ui/card";
import { IconButton } from "@/components/ui/icon-button";

type Props = {
  draftId: string | null;
  files: File[];
  templatePaths: string[];
  pastedTemplateText: string;
  onFilesChange: (files: File[]) => void;
  onDraftChange: (id: string | null) => void;
  onPathsChange: (paths: string[]) => void;
  onPastedTextChange: (t: string) => void;
  onAnalyzed: (style: TemplateStyle) => void;
};

export function StepTemplate({
  draftId,
  files,
  templatePaths,
  pastedTemplateText,
  onFilesChange,
  onDraftChange,
  onPathsChange,
  onPastedTextChange,
  onAnalyzed,
}: Props) {
  const [busy, setBusy] = useState(false);
  const hasText = Boolean(pastedTemplateText.trim());
  const canSubmit = (files.length > 0 || hasText) && !busy;

  const onFiles = useCallback((list: FileList | null) => {
    if (!list?.length) return;
    const merged = [...files];
    for (const f of Array.from(list)) {
      if (merged.length >= 3) break;
      const exists = merged.some(
        (x) => x.name === f.name && x.size === f.size && x.lastModified === f.lastModified
      );
      if (!exists) merged.push(f);
    }
    onFilesChange(merged.slice(0, 3));
  }, [files, onFilesChange]);

  const removeFile = useCallback((idx: number) => {
    onFilesChange(files.filter((_, i) => i !== idx));
  }, [files, onFilesChange]);

  const previews = useMemo(
    () => files.map((f) => ({ name: f.name, url: URL.createObjectURL(f) })),
    [files]
  );

  useEffect(
    () => () => {
      previews.forEach((p) => URL.revokeObjectURL(p.url));
    },
    [previews]
  );

  async function onNext() {
    if (!files.length && !hasText) {
      toast.error("Add task screenshots or paste your task text.");
      return;
    }
    setBusy(true);
    try {
      if (files.length > 0) {
        const { draftId: id, paths } = await tarasUpload(files);
        onDraftChange(id);
        onPathsChange(paths);
        const { templateStyle } = await tarasAnalyzeTemplate({
          draftId: id,
          pastedText: pastedTemplateText || undefined,
        });
        onAnalyzed(templateStyle as TemplateStyle);
      } else {
        // Text-only flow: allow continuing without screenshots.
        const syntheticDraft = `text-only-${crypto.randomUUID()}`;
        onDraftChange(syntheticDraft);
        onPathsChange([]);
        onAnalyzed({
          inferredLanguage: "unknown",
          register: "unknown",
          notes: pastedTemplateText.trim().slice(0, 2000),
        } as TemplateStyle);
      }
    } catch (e) {
      handleAppError(e, toast);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardContent className="space-y-4 p-4">
        <Field
          label={`Task screenshots (${files.length}/3)`}
          helpText="Add up to 3 images. Selecting more files appends; it does not replace existing ones. You can also skip images and use pasted text only."
        >
          <div className="space-y-3">
            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-surface px-4 py-6 text-sm font-medium text-ink transition-colors hover:bg-surface-2">
              <ImagePlus className="h-4 w-4 text-ink-soft" />
              Add task screenshots
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => onFiles(e.target.files)}
              />
            </label>
            {files.length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-3">
                {previews.map((f, i) => (
                  <div key={`${f.name}-${i}`} className="relative rounded-lg border border-border bg-surface p-2">
                    <img src={f.url} alt={f.name} className="h-28 w-full rounded-md object-cover" />
                    <p className="mt-2 line-clamp-1 text-xs text-ink-soft">{f.name}</p>
                    <IconButton
                      size="sm"
                      variant="outline"
                      className="absolute right-3 top-3 bg-surface/90 backdrop-blur-sm"
                      aria-label={`Remove ${f.name}`}
                      onClick={() => removeFile(i)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </IconButton>
                  </div>
                ))}
              </div>
            ) : null}
            {files.length === 0 && templatePaths.length > 0 ? (
              <p className="text-xs text-ink-soft">
                {templatePaths.length} uploaded screenshot(s) already attached to this draft.
              </p>
            ) : null}
          </div>
        </Field>

        <Field label="Task text (optional if you uploaded screenshots, required if none)">
          <Textarea
            value={pastedTemplateText}
            onChange={(e) => onPastedTextChange(e.target.value)}
            placeholder="Paste headings / structure hints…"
            className="min-h-[100px]"
            maxLength={8000}
          />
        </Field>

      {draftId ? (
        <p className="text-xs text-ink-soft">Draft id: {draftId}</p>
      ) : null}
      <Button type="button" onClick={onNext} disabled={!canSubmit}>
        {busy ? "Analyzing task…" : "Continue"}
      </Button>
      </CardContent>
    </Card>
  );
}
