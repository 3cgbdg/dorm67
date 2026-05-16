import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { AlertTriangle } from "lucide-react";
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
import { tarasFetchJob } from "@/lib/tarasApi";

export type TarasWizardStep = "template" | "metadata" | "content" | "preview";

const STEPS: TarasWizardStep[] = ["template", "metadata", "content", "preview"];

export function TarasPage() {
  const user = useAuthStore((s) => s.user);
  const profile = useAuthStore((s) => s.profile);
  const [searchParams, setSearchParams] = useSearchParams();
  const jobIdFromUrl = searchParams.get("jobId");

  const [step, setStep] = useState<TarasWizardStep>("template");
  const [draftId, setDraftId] = useState<string | null>(null);
  const [templatePaths, setTemplatePaths] = useState<string[]>([]);
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
  const [activeJobId, setActiveJobId] = useState<string | null>(jobIdFromUrl);

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
    setStep(s);
  }

  function startNewReport() {
    setSearchParams({});
    setActiveJobId(null);
    setStep("template");
    setDraftId(null);
    setTemplatePaths([]);
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
        description="Generate a lab report (.docx) from your templates and notes."
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
                className={`rounded-full px-3 py-1 ${
                  step === s ? "bg-brand text-white" : "bg-surface-2 hover:text-ink"
                }`}
              >
                {i + 1}. {s}
              </button>
            ))}
          </nav>

          {step === "template" && (
            <StepTemplate
              draftId={draftId}
              templatePaths={templatePaths}
              pastedTemplateText={pastedTemplateText}
              onDraftChange={setDraftId}
              onPathsChange={setTemplatePaths}
              onPastedTextChange={setPastedTemplateText}
              onAnalyzed={(style) => {
                setTemplateStyle(style);
                goTo("metadata");
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
              onChange={setInputs}
              onBack={() => goTo("metadata")}
              onNext={() => goTo("preview")}
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
