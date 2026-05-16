/**
 * Badge — small status / label chip.
 * Variants: default | brand | brand-soft | success | warning | danger | danger-soft | outline
 */
import type { HTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium", {
  variants: {
    variant: {
      default: "bg-surface-2 text-ink",
      brand: "bg-brand text-brand-fg",
      "brand-soft": "bg-brand-soft text-brand",
      success: "bg-success/15 text-success",
      warning: "bg-warning/15 text-warning",
      danger: "bg-danger text-white",
      "danger-soft": "bg-danger-soft text-danger",
      outline: "border border-border bg-transparent text-ink",
    },
  },
  defaultVariants: { variant: "default" },
});

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
