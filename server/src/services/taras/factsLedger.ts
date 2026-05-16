import type { ReportJsonV1 } from "./schema.js";
import type { TarasInputs } from "./sanitizeInputs.js";

export type Assumption = { id: string; text: string };

export type LedgerSymbol = { name: string; meaning: string; unit?: string };

export type ComputedResult = { name: string; value: string; unit?: string; sourceSection: string };

export type LedgerDelta = {
  symbols?: LedgerSymbol[];
  assumptions?: { text: string }[];
  computedResults?: { name: string; value: string; unit?: string }[];
};

export type FactsLedger = {
  symbols: LedgerSymbol[];
  assumptions: Assumption[];
  results: ComputedResult[];
};

function nextAssumptionId(ledger: FactsLedger): number {
  let max = 0;
  for (const a of ledger.assumptions) {
    const m = /^A(\d+)$/.exec(a.id);
    if (m) max = Math.max(max, Number(m[1]));
  }
  return max + 1;
}

function dedupeSymbols(symbols: LedgerSymbol[]): LedgerSymbol[] {
  const byName = new Map<string, LedgerSymbol>();
  for (const s of symbols) {
    const key = s.name.trim().toLowerCase();
    if (!key) continue;
    byName.set(key, { ...s, name: s.name.trim() });
  }
  return [...byName.values()];
}

export function initLedger(inputs: TarasInputs): FactsLedger {
  const symbols: LedgerSymbol[] = [];
  if (inputs.measurements.headers.length) {
    symbols.push({
      name: "measurement_columns",
      meaning: inputs.measurements.headers.filter(Boolean).join(", "),
    });
  }
  const g = inputs.goal.trim();
  if (g.length > 0) {
    symbols.push({ name: "task_goal", meaning: g.slice(0, 500) });
  }
  return { symbols: dedupeSymbols(symbols), assumptions: [], results: [] };
}

export function applyDelta(ledger: FactsLedger, delta: LedgerDelta | undefined, sectionHeading: string): FactsLedger {
  if (!delta) return ledger;
  let nextId = nextAssumptionId(ledger);
  const newAssumptions = [...ledger.assumptions];
  for (const a of delta.assumptions ?? []) {
    const text = (a.text || "").trim();
    if (!text) continue;
    newAssumptions.push({ id: `A${nextId}`, text });
    nextId += 1;
  }
  const newResults = [...ledger.results];
  for (const r of delta.computedResults ?? []) {
    const name = (r.name || "").trim();
    const value = (r.value || "").trim();
    if (!name || !value) continue;
    newResults.push({
      name,
      value,
      unit: r.unit?.trim() || undefined,
      sourceSection: sectionHeading,
    });
  }
  const mergedSymbols = dedupeSymbols([...ledger.symbols, ...(delta.symbols ?? [])]);
  return {
    symbols: mergedSymbols,
    assumptions: newAssumptions,
    results: newResults,
  };
}

/** Merge multiple section deltas in batch order (same order as `headings`). */
export function mergeDeltas(
  ledger: FactsLedger,
  deltas: (LedgerDelta | undefined)[],
  headings: string[]
): FactsLedger {
  let out = ledger;
  for (let i = 0; i < deltas.length; i++) {
    out = applyDelta(out, deltas[i], headings[i] ?? `Section ${i + 1}`);
  }
  return out;
}

export function snapshotForPrompt(ledger: FactsLedger, maxChars = 4000): string {
  const payload = {
    symbols: ledger.symbols,
    assumptions: ledger.assumptions,
    computedResults: ledger.results,
  };
  let s = JSON.stringify(payload);
  if (s.length <= maxChars) return s;
  return s.slice(0, maxChars) + "\n…(truncated)";
}

/** Best-effort ledger from an existing report (for refine). */
export function ledgerFromReport(report: ReportJsonV1): FactsLedger {
  const symbols: LedgerSymbol[] = [{ name: "topic", meaning: report.metadata.topic }];
  const results: ComputedResult[] = [];
  for (const sec of report.sections) {
    if (sec.table?.headers?.length) {
      results.push({
        name: `table:${sec.heading.slice(0, 80)}`,
        value: `${sec.table.headers.join(" | ")} …`,
        sourceSection: sec.heading,
      });
    }
    if (sec.formula?.trim()) {
      results.push({
        name: `formula:${sec.heading.slice(0, 60)}`,
        value: sec.formula.trim().slice(0, 500),
        sourceSection: sec.heading,
      });
    }
  }
  return { symbols, assumptions: [], results };
}
