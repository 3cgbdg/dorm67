import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

type SectionProps = HTMLAttributes<HTMLDivElement> & {
  title?: string;
  action?: ReactNode;
};

export function Section({ title, action, className, children, ...props }: SectionProps) {
  return (
    <section className={cn("space-y-3", className)} {...props}>
      {(title || action) && (
        <div className="flex items-center justify-between gap-2">
          {title ? <h2 className="text-lg font-semibold text-ink">{title}</h2> : <div />}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}
