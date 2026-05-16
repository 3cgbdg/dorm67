/**
 * Field — label + control + optional help + error text.
 * Props: label; htmlFor; error?; helpText?; children (control); className.
 */
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";

type FieldProps = {
  label: string;
  htmlFor?: string;
  error?: string;
  helpText?: string;
  className?: string;
  children: ReactNode;
};

export function Field({ label, htmlFor, error, helpText, className, children }: FieldProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor={htmlFor} className={error ? "text-danger" : undefined}>
        {label}
      </Label>
      {children}
      {helpText && !error ? <p className="text-xs text-ink-soft">{helpText}</p> : null}
      {error ? <p className="text-xs text-danger">{error}</p> : null}
    </div>
  );
}
