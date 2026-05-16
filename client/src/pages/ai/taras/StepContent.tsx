import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { IconButton } from "@/components/ui/icon-button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Minus, Plus, Sparkles, Trash2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import type { TarasInputs } from "@/lib/tarasTypes";

type Props = {
  inputs: TarasInputs;
  useMeasurements: boolean;
  measurementsSuggested?: boolean;
  measurementNumericCount?: number;
  canAutoParse?: boolean;
  autoParsing?: boolean;
  onAutoParse?: (highQuality: boolean) => void;
  onUseMeasurementsChange: (enabled: boolean) => void;
  onChange: (i: TarasInputs) => void;
  onBack: () => void;
  onNext: () => void;
};

export function StepContent({
  inputs,
  useMeasurements,
  measurementsSuggested = false,
  measurementNumericCount = 0,
  canAutoParse = false,
  autoParsing = false,
  onAutoParse,
  onUseMeasurementsChange,
  onChange,
  onBack,
  onNext,
}: Props) {
  const { measurements } = inputs;
  const hasMeasurementData =
    measurements.headers.some((h) => h.trim()) &&
    measurements.rows.some((r) => r.some((c) => c.trim()));
  const canContinue = Boolean(
    inputs.goal.trim() &&
      inputs.theoryNotes.trim() &&
      inputs.procedureNotes.trim() &&
      inputs.conclusionsHints.trim() &&
      (!useMeasurements || hasMeasurementData)
  );

  function setHeaders(next: string[]) {
    onChange({ ...inputs, measurements: { ...measurements, headers: next } });
  }

  function setRows(next: string[][]) {
    onChange({ ...inputs, measurements: { ...measurements, rows: next } });
  }

  function addRow() {
    const cols = measurements.headers.length || 3;
    setRows([...measurements.rows, Array.from({ length: cols }, () => "")]);
  }

  function addColumn() {
    if (measurements.headers.length >= 20) return;
    const nextHeaders = [...measurements.headers, `Column ${measurements.headers.length + 1}`];
    const nextRows = measurements.rows.map((r) => [...r, ""]);
    onChange({ ...inputs, measurements: { headers: nextHeaders, rows: nextRows } });
  }

  function removeLastColumn() {
    if (measurements.headers.length <= 1) return;
    const nextHeaders = measurements.headers.slice(0, -1);
    const nextRows = measurements.rows.map((r) => r.slice(0, -1));
    onChange({ ...inputs, measurements: { headers: nextHeaders, rows: nextRows } });
  }

  function removeRow(i: number) {
    setRows(measurements.rows.filter((_, idx) => idx !== i));
  }

  function fillTransportExample() {
    const headers = ["Source", "Destination", "Supply/Demand", "Cost per unit", "Allocated x_ij"];
    const rows = [
      ["A1", "B1", "120", "8", "0"],
      ["A1", "B2", "120", "6", "0"],
      ["A2", "B1", "80", "9", "0"],
    ];
    onChange({ ...inputs, measurements: { headers, rows } });
  }

  return (
    <div className="space-y-4 rounded-xl border border-border bg-surface p-4">
      <div className="rounded-lg border border-warning/30 bg-warning-soft px-3 py-2 text-sm">
        Enter your real measurements and data. Taras will not invent numeric values — use placeholders if
        unknown.
      </div>
      <div>
        <Label>Goal (мета)</Label>
        <Textarea
          className="mt-1 min-h-[72px]"
          value={inputs.goal}
          onChange={(e) => onChange({ ...inputs, goal: e.target.value })}
          maxLength={2000}
        />
      </div>
      <div>
        <Label>Theory notes</Label>
        <Textarea
          className="mt-1 min-h-[120px]"
          value={inputs.theoryNotes}
          onChange={(e) => onChange({ ...inputs, theoryNotes: e.target.value })}
          maxLength={8000}
        />
      </div>
      <div>
        <Label>Procedure / хід роботи</Label>
        <Textarea
          className="mt-1 min-h-[120px]"
          value={inputs.procedureNotes}
          onChange={(e) => onChange({ ...inputs, procedureNotes: e.target.value })}
          maxLength={8000}
        />
      </div>
      <div className="flex items-center justify-between rounded-lg border border-border bg-surface-2/40 px-3 py-2">
        <div className="space-y-0.5">
          <Label className="text-sm">Include measurements table</Label>
          <p className="text-xs text-ink-soft">
            Turn this off if your task is theoretical and has no numeric dataset.
          </p>
          {measurementsSuggested ? (
            <p className="text-xs text-warning">
              This task looks numeric/calculation-heavy. Keeping the table ON is recommended.
            </p>
          ) : null}
          {useMeasurements ? (
            <p className="text-xs text-ink-soft">Detected numeric cells: {measurementNumericCount}</p>
          ) : null}
        </div>
        <Switch checked={useMeasurements} onCheckedChange={onUseMeasurementsChange} />
      </div>

      {useMeasurements ? (
        <Card>
        <CardContent className="space-y-3 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <Label>Measurements table</Label>
              <p className="text-xs text-ink-soft">
                Fill at least one meaningful data row. You can edit column names.
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => onAutoParse?.(false)}
                disabled={!canAutoParse || autoParsing}
              >
                {autoParsing ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Sparkles className="mr-1 h-3.5 w-3.5" />}
                Auto parse
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => onAutoParse?.(true)}
                disabled={!canAutoParse || autoParsing}
              >
                HQ parse
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={addColumn}>
                <Plus className="mr-1 h-3.5 w-3.5" />
                Add column
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={removeLastColumn}
                disabled={measurements.headers.length <= 1}
              >
                <Minus className="mr-1 h-3.5 w-3.5" />
                Remove column
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={fillTransportExample}>
                Use example
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={addRow}>
                <Plus className="mr-1 h-3.5 w-3.5" />
                Add row
              </Button>
            </div>
          </div>

          {/* Desktop table */}
          <div className="hidden overflow-x-auto rounded-lg border border-border md:block">
            <table className="w-full min-w-[420px] text-sm">
              <thead className="bg-surface-2/60">
                <tr>
                  <th className="w-10 border-b border-border px-2 py-2 text-left text-xs font-semibold text-ink-soft">#</th>
                  {measurements.headers.map((h, i) => (
                    <th key={i} className="border-b border-border p-1.5">
                      <Input
                        value={h}
                        placeholder={`Column ${i + 1}`}
                        onChange={(e) => {
                          const next = [...measurements.headers];
                          next[i] = e.target.value;
                          setHeaders(next);
                        }}
                      />
                    </th>
                  ))}
                  <th className="w-12 border-b border-border px-2 py-2" />
                </tr>
              </thead>
              <tbody>
                {measurements.rows.map((row, ri) => (
                  <tr key={ri} className={ri % 2 === 0 ? "bg-surface" : "bg-surface-2/25"}>
                    <td className="border-t border-border px-2 py-2 text-xs font-medium text-ink-soft">{ri + 1}</td>
                    {row.map((cell, ci) => (
                      <td key={ci} className="border-t border-border p-1.5">
                        <Input
                          value={cell}
                          onChange={(e) => {
                            const next = measurements.rows.map((r) => [...r]);
                            next[ri][ci] = e.target.value;
                            setRows(next);
                          }}
                        />
                      </td>
                    ))}
                    <td className="border-t border-border px-2 py-2">
                      <IconButton
                        type="button"
                        size="sm"
                        variant="ghost"
                        aria-label={`Remove row ${ri + 1}`}
                        onClick={() => removeRow(ri)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </IconButton>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="space-y-3 md:hidden">
            {measurements.rows.map((row, ri) => (
              <div key={ri} className="rounded-lg border border-border bg-surface p-3">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-xs font-semibold text-ink-soft">Row {ri + 1}</p>
                  <IconButton
                    type="button"
                    size="sm"
                    variant="ghost"
                    aria-label={`Remove row ${ri + 1}`}
                    onClick={() => removeRow(ri)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </IconButton>
                </div>
                <div className="space-y-2">
                  {row.map((cell, ci) => (
                    <div key={ci} className="space-y-1">
                      <Label className="text-xs text-ink-soft">{measurements.headers[ci] || `Column ${ci + 1}`}</Label>
                      <Input
                        value={cell}
                        onChange={(e) => {
                          const next = measurements.rows.map((r) => [...r]);
                          next[ri][ci] = e.target.value;
                          setRows(next);
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
        </Card>
      ) : (
        <div className="rounded-lg border border-border bg-surface-2/30 px-3 py-2 text-sm text-ink-soft">
          Measurements table is skipped for this report.
        </div>
      )}
      <div>
        <Label>Conclusions hints</Label>
        <Textarea
          className="mt-1 min-h-[80px]"
          value={inputs.conclusionsHints}
          onChange={(e) => onChange({ ...inputs, conclusionsHints: e.target.value })}
          maxLength={4000}
        />
      </div>
      <div className="flex gap-2">
        <Button type="button" variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button type="button" onClick={onNext} disabled={!canContinue}>
          Generate report
        </Button>
      </div>
    </div>
  );
}
