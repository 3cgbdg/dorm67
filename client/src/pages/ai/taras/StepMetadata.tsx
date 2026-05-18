import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import type { TarasLanguage } from "@/lib/tarasTypes";

export type MetadataState = {
  subject: string;
  labNumber: string;
  topic: string;
  variant: string;
  studentName: string;
  group: string;
};

type Props = {
  language: TarasLanguage;
  onLanguageChange: (l: TarasLanguage) => void;
  values: MetadataState;
  onChange: (v: MetadataState) => void;
  onBack: () => void;
  onNext: () => void;
};

export function StepMetadata({ language, onLanguageChange, values, onChange, onBack, onNext }: Props) {
  const canContinue = Boolean(
    values.subject.trim() &&
      values.labNumber.trim() &&
      values.topic.trim() &&
      values.studentName.trim() &&
      values.group.trim()
  );

  return (
    <div className="space-y-4 rounded-xl border border-border bg-surface p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label>Language</Label>
          <Select
            className="mt-1"
            value={language}
            onValueChange={(v) => onLanguageChange(v as TarasLanguage)}
            options={[
              { value: "uk", label: "Українська" },
              { value: "en", label: "English" },
            ]}
          />
        </div>
        <div>
          <Label>Lab number</Label>
          <Input
            className="mt-1"
            value={values.labNumber}
            onChange={(e) => onChange({ ...values, labNumber: e.target.value })}
          />
        </div>
        <div className="sm:col-span-2">
          <Label>Subject</Label>
          <Input
            className="mt-1"
            value={values.subject}
            onChange={(e) => onChange({ ...values, subject: e.target.value })}
          />
        </div>
        <div className="sm:col-span-2">
          <Label>Topic</Label>
          <Input
            className="mt-1"
            value={values.topic}
            onChange={(e) => onChange({ ...values, topic: e.target.value })}
          />
        </div>
        <div>
          <Label>Student name</Label>
          <Input
            className="mt-1"
            value={values.studentName}
            onChange={(e) => onChange({ ...values, studentName: e.target.value })}
          />
        </div>
        <div>
          <Label>Group / dorm</Label>
          <Input
            className="mt-1"
            value={values.group}
            onChange={(e) => onChange({ ...values, group: e.target.value })}
          />
        </div>
        <div className="sm:col-span-2">
          <Label>Variant (optional)</Label>
          <Input
            className="mt-1"
            value={values.variant}
            onChange={(e) => onChange({ ...values, variant: e.target.value })}
          />
        </div>
      </div>
      <div className="flex gap-2">
        <Button type="button" variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button
          type="button"
          onClick={onNext}
          disabled={!canContinue}
        >
          Continue
        </Button>
      </div>
    </div>
  );
}
