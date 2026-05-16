/**
 * Chip — filter / toggle pill (button role).
 * Props: selected?, onClick?, children, className, disabled?
 */
import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type ChipProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  selected?: boolean;
};

export function Chip({ className, selected, type = "button", children, ...props }: ChipProps) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex items-center justify-center rounded-full border px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-ring focus-visible:ring-offset-2 focus-visible:ring-offset-bg disabled:pointer-events-none disabled:opacity-50 motion-reduce:transition-none",
        selected
          ? "border-brand bg-brand-soft text-brand"
          : "border-border bg-surface text-ink hover:bg-surface-2",
        className
      )}
      data-state={selected ? "on" : "off"}
      {...props}
    >
      {children}
    </button>
  );
}
