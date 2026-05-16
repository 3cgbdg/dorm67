import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type ErrorStateProps = {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
};

export function ErrorState({ icon: Icon, title, description, action, className }: ErrorStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border border-danger/30 bg-danger-soft/50 p-8 text-center",
        className
      )}
    >
      {Icon ? (
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-danger/10">
          <Icon className="h-6 w-6 text-danger" />
        </div>
      ) : null}
      <h3 className="mb-1 text-lg font-semibold text-ink">{title}</h3>
      {description ? <p className="mb-4 max-w-sm text-sm text-ink-soft">{description}</p> : null}
      {action ?? <Button variant="outline">Try again</Button>}
    </div>
  );
}
