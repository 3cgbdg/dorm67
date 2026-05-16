import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type ListItemProps = {
  leading: ReactNode;
  title: string;
  subtitle?: string;
  trailing?: ReactNode;
  className?: string;
  onClick?: () => void;
};

export function ListItem({ leading, title, subtitle, trailing, className, onClick }: ListItemProps) {
  const Comp = onClick ? "button" : "div";
  return (
    <Comp
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 rounded-xl border border-border bg-surface p-3 text-left shadow-card transition-colors",
        onClick && "hover:bg-surface-2/50",
        className
      )}
    >
      {leading}
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-ink">{title}</p>
        {subtitle ? <p className="truncate text-sm text-ink-soft">{subtitle}</p> : null}
      </div>
      {trailing ? <div className="shrink-0">{trailing}</div> : null}
    </Comp>
  );
}
