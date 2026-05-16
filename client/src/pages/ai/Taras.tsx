import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { useAuthStore } from "@/store/authStore";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { ReportArchive } from "@/pages/ai/taras/ReportArchive";
import { StepTemplate } from "@/pages/ai/taras/StepTemplate";
import { StepMetadata } from "@/pages/ai/taras/StepMetadata";
import { StepContent } from "@/pages/ai/taras/StepContent";
import { StepPreview } from "@/pages/ai/taras/StepPreview";
import type { TarasInputs, TarasLanguage, TemplateStyle } from "@/lib/tarasTypes";
import type { MetadataState } from "@/pages/ai/taras/StepMetadata";
import { tarasExtractMeasurements, tarasFetchJob } from "@/lib/tarasApi";

export type TarasWizardStep = "template" | "metadata" | "content" | "preview";

const STEPS: TarasWizardStep[] = ["template", "metadata", "content", "preview"];
const STEP_LABELS: Record<TarasWizardStep, string> = {
  template: "task definition",
  metadata: "metadata",
  content: "content",
  preview: "preview",
};

const QUANT_LAB_HINTS = [
  "транспорт",
  "матриц",
  "потенціал",
  "мінімальн",
  "варт",
  "cost",
  "supply",
  "demand",
  "lp",
  "linear programming",
  "оптим",
  "числ",
  "розрах",
];

export function TarasPage() {
  const user = useAuthStore((s) => s.user);
  const profile = useAuthStore((s) => s.profile);
  const [searchParams, setSearchParams] = useSearchParams();
  const jobIdFromUrl = searchParams.get("jobId");

  const [step, setStep] = useState<TarasWizardStep>("template");
  const [draftId, setDraftId] = useState<string | null>(null);
  const [templatePaths, setTemplatePaths] = useState<string[]>([]);
  const [taskFiles, setTaskFiles] = useState<File[]>([]);
  const [templateStyle, setTemplateStyle] = useState<TemplateStyle | null>(null);
  const [pastedTemplateText, setPastedTemplateText] = useState("");
  const [language, setLanguage] = useState<TarasLanguage>("uk");
  const [metadata, setMetadata] = useState<MetadataState>({
    subject: "",
    labNumber: "",
    topic: "",
    variant: "",
    studentName: "",
    group: "",
  });
  const [inputs, setInputs] = useState<TarasInputs>({
    goal: "",
    theoryNotes: "",
    procedureNotes: "",
    measurements: { headers: ["Parameter", "Value", "Unit"], rows: [["", "", ""]] },
    conclusionsHints: "",
  });
  const [useMeasurements, setUseMeasurements] = useState(true);
  const [autoParsing, setAutoParsing] = useState(false);
  const [activeJobId, setActiveJobId] = useState<string | null>(jobIdFromUrl);

  // Step 1 is complete only after user explicitly continues (which prepares draftId + templateStyle).
  const templateStepComplete = Boolean(draftId && templateStyle);
  const taskContext = `${metadata.topic} ${pastedTemplateText}`.toLowerCase();
  const needsMeasurementsSuggested = QUANT_LAB_HINTS.some((hint) => taskContext.includes(hint));
  const measurementNumericCount = inputs.measurements.rows
    .flat()
    .filter((c) => /\d/.test(c)).length;
  const metadataStepComplete = Boolean(
    metadata.subject.trim() &&
      metadata.labNumber.trim() &&
      metadata.topic.trim() &&
      metadata.studentName.trim() &&
      metadata.group.trim()
  );
  const contentStepComplete = Boolean(
    inputs.goal.trim() &&
      inputs.theoryNotes.trim() &&
      inputs.procedureNotes.trim() &&
      inputs.conclusionsHints.trim() &&
      (!useMeasurements ||
        (inputs.measurements.headers.some((h) => h.trim()) &&
          inputs.measurements.rows.some((r) => r.some((c) => c.trim())))
      )
  );

  const stepEnabled: Record<TarasWizardStep, boolean> = {
    template: true,
    metadata: templateStepComplete,
    content: templateStepComplete && metadataStepComplete,
    preview: templateStepComplete && metadataStepComplete && contentStepComplete,
  };

  useEffect(() => {
    if (!metadata.studentName && (profile?.fullName || user?.displayName)) {
      setMetadata((m) => ({
        ...m,
        studentName: profile?.fullName || user?.displayName || "",
        group: m.group || profile?.dormName || "",
      }));
    }
  }, [profile, user, metadata.studentName]);

  useEffect(() => {
    if (jobIdFromUrl) {
      setActiveJobId(jobIdFromUrl);
      setStep("preview");
    }
  }, [jobIdFromUrl]);

  function goTo(s: TarasWizardStep) {
    if (!stepEnabled[s]) return;
    setStep(s);
  }

  function startGenerationFromContent() {
    const issues: string[] = [];
    if (needsMeasurementsSuggested && !useMeasurements) {
      issues.push("For this task type, enable measurements table.");
    }
    if (useMeasurements && measurementNumericCount < 3) {
      issues.push("Add more numeric values in measurements (at least 3 cells with numbers).");
    }
    if (needsMeasurementsSuggested && measurementNumericCount < 3 && !/\d/.test(pastedTemplateText)) {
      issues.push("Task definition seems numeric; add matrix/values in task text or table.");
    }
    if (issues.length) {
      toast.error(`Cannot generate yet: ${issues[0]}`);
      setStep("content");
      return;
    }

    // Ensure Preview starts a fresh generation instead of reusing a prior job id.
    setActiveJobId(null);
    setSearchParams({});
    goTo("preview");
  }

  async function handleAutoParseMeasurements(highQuality: boolean) {
    if (!draftId) {
      toast.error("Add screenshots in Task Definition and press Continue first.");
      return;
    }
    setAutoParsing(true);
    try {
      const { table } = await tarasExtractMeasurements({
        draftId,
        pastedText: pastedTemplateText || undefined,
        highQuality,
      });
      if (!table.headers.length || !table.rows.length) {
        toast.error("Could not extract a usable table. Add clearer screenshot/text.");
        return;
      }
      setUseMeasurements(true);
      setInputs((prev) => ({
        ...prev,
        measurements: {
          headers: table.headers.slice(0, 20),
          rows: table.rows.slice(0, 50).map((r) => r.slice(0, 20)),
        },
      }));
      toast.success(
        `Parsed table: ${table.headers.length} columns, ${table.rows.length} rows` +
          (typeof table.confidence === "number" ? ` (confidence ${(table.confidence * 100).toFixed(0)}%)` : "")
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Auto parse failed";
      toast.error(msg);
    } finally {
      setAutoParsing(false);
    }
  }

  function startNewReport() {
    setSearchParams({});
    setActiveJobId(null);
    setStep("template");
    setDraftId(null);
    setTemplatePaths([]);
    setTaskFiles([]);
    setTemplateStyle(null);
    setPastedTemplateText("");
    setLanguage("uk");
    setMetadata({
      subject: "",
      labNumber: "",
      topic: "",
      variant: "",
      studentName: user?.displayName ?? "",
      group: "",
    });
    setInputs({
      goal: "",
      theoryNotes: "",
      procedureNotes: "",
      measurements: { headers: ["Parameter", "Value", "Unit"], rows: [["", "", ""]] },
      conclusionsHints: "",
    });
    setUseMeasurements(true);
  }

  function openJob(id: string) {
    setSearchParams({ jobId: id });
    setActiveJobId(id);
    setStep("preview");
  }

  async function forkFromJob(id: string) {
    try {
      const j = await tarasFetchJob(id);
      const inp = j.inputs as TarasInputs | undefined;
      const meta = j.metadata as MetadataState | undefined;
      const lang = (j.language as TarasLanguage) || "uk";
      const style = (j.templateStyle as TemplateStyle) || {};
      if (inp) setInputs(inp);
      if (meta) setMetadata((prev) => ({ ...prev, ...meta }));
      setLanguage(lang);
      setTemplateStyle(style);
      setDraftId(null);
      setTemplatePaths([]);
      setTaskFiles([]);
      setActiveJobId(null);
      setSearchParams({});
      setStep("content");
    } catch {
      startNewReport();
    }
  }

  if (!user) return null;

  return (
    <PageContainer className="max-w-6xl">
      <PageHeader
        title="Taras"
        description="Generate a lab report (.docx) from your task definition, metadata, and notes."
      />

      <div className="mb-4 flex items-start gap-3 rounded-xl border border-warning/30 bg-warning-soft px-4 py-3 text-sm text-ink">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
        <p>
          Taras drafts and formats reports. Verify all measurements and conclusions before submitting.
        </p>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row">
        <aside className="shrink-0 lg:w-64">
          <ReportArchive
            activeJobId={activeJobId}
            onNew={startNewReport}
            onOpen={openJob}
            onFork={forkFromJob}
          />
        </aside>

        <div className="min-w-0 flex-1 space-y-6">
          <nav className="flex flex-wrap gap-2 text-xs font-medium text-ink-soft">
            {STEPS.map((s, i) => (
              <button
                key={s}
                type="button"
                onClick={() => goTo(s)}
                disabled={!stepEnabled[s]}
                className={`rounded-full px-3 py-1 ${
                  step === s
                    ? "bg-brand text-white"
                    : stepEnabled[s]
                    ? "bg-surface-2 hover:text-ink"
                    : "cursor-not-allowed bg-surface-2/60 text-ink-soft"
                }`}
              >
                {i + 1}. {STEP_LABELS[s]}
              </button>
            ))}
          </nav>

          {step === "template" && (
            <StepTemplate
              draftId={draftId}
              files={taskFiles}
              templatePaths={templatePaths}
              pastedTemplateText={pastedTemplateText}
              onFilesChange={setTaskFiles}
              onDraftChange={setDraftId}
              onPathsChange={setTemplatePaths}
              onPastedTextChange={setPastedTemplateText}
              onAnalyzed={(style) => {
                setTemplateStyle(style);
                // Move immediately after successful step-1 preparation.
                // `goTo("metadata")` can be blocked for one render due to async state updates.
                setStep("metadata");
              }}
            />
          )}

          {step === "metadata" && (
            <StepMetadata
              language={language}
              onLanguageChange={setLanguage}
              values={metadata}
              onChange={setMetadata}
              onBack={() => goTo("template")}
              onNext={() => goTo("content")}
            />
          )}

          {step === "content" && (
            <StepContent
              inputs={inputs}
              useMeasurements={useMeasurements}
              measurementsSuggested={needsMeasurementsSuggested}
              measurementNumericCount={measurementNumericCount}
              canAutoParse={Boolean(draftId)}
              autoParsing={autoParsing}
              onAutoParse={handleAutoParseMeasurements}
              onUseMeasurementsChange={setUseMeasurements}
              onChange={setInputs}
              onBack={() => goTo("metadata")}
              onNext={startGenerationFromContent}
            />
          )}

          {step === "preview" && (
            <StepPreview
              userId={user.uid}
              jobId={activeJobId}
              draftId={draftId}
              templateStyle={templateStyle}
              language={language}
              metadata={metadata}
              inputs={inputs}
              templateRefs={templatePaths}
              onJobCreated={(id) => {
                setActiveJobId(id);
                setSearchParams({ jobId: id });
              }}
              onBack={() => goTo("content")}
            />
          )}
        </div>
      </div>
    </PageContainer>
  );
}
