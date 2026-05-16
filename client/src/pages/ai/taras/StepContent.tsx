import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { TarasInputs } from "@/lib/tarasTypes";

type Props = {
  inputs: TarasInputs;
  onChange: (i: TarasInputs) => void;
  onBack: () => void;
  onNext: () => void;
};

export function StepContent({ inputs, onChange, onBack, onNext }: Props) {
  const { measurements } = inputs;

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

  function removeRow(i: number) {
    setRows(measurements.rows.filter((_, idx) => idx !== i));
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
      <div>
        <div className="mb-2 flex items-center justify-between">
          <Label>Measurements table</Label>
          <Button type="button" size="sm" variant="outline" onClick={addRow}>
            Add row
          </Button>
        </div>
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-[320px] text-sm">
            <thead>
              <tr>
                {measurements.headers.map((h, i) => (
                  <th key={i} className="border-b border-border p-1">
                    <Input
                      value={h}
                      onChange={(e) => {
                        const next = [...measurements.headers];
                        next[i] = e.target.value;
                        setHeaders(next);
                      }}
                    />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {measurements.rows.map((row, ri) => (
                <tr key={ri}>
                  {row.map((cell, ci) => (
                    <td key={ci} className="border-t border-border p-1">
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
                  <td className="w-10 border-t border-border p-1">
                    <Button type="button" size="sm" variant="ghost" onClick={() => removeRow(ri)}>
                      ×
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
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
        <Button type="button" onClick={onNext}>
          Generate report
        </Button>
      </div>
    </div>
  );
}
