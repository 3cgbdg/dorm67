import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type KpiCardProps = {
  label: string;
  value: number | string;
  icon?: LucideIcon;
  delta?: string;
  className?: string;
};

export function KpiCard({ label, value, icon: Icon, delta, className }: KpiCardProps) {
  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <p className="text-xs font-medium text-ink-soft">{label}</p>
          {Icon ? <Icon className="h-4 w-4 shrink-0 text-brand opacity-80" /> : null}
        </div>
        <p className="mt-1 text-2xl font-semibold tabular-nums text-ink">{value}</p>
        {delta ? <p className="mt-1 text-xs text-success">{delta}</p> : null}
      </CardContent>
    </Card>
  );
}
