export type TarasLanguage = "uk" | "en";

export type TarasInputs = {
  goal: string;
  theoryNotes: string;
  procedureNotes: string;
  measurements: { headers: string[]; rows: string[][] };
  conclusionsHints: string;
};

export type TemplateStyle = Record<string, unknown>;

export type TarasJobSummary = {
  id: string;
  title?: string;
  status?: string;
  language?: string;
  labNumber?: string;
  topic?: string;
  latestRevision?: number;
  error?: string;
};
