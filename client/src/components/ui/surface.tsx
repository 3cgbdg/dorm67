/**
 * Surface — elevated panel (bg-surface + radius + shadow).
 * Props: as?: "div" | "section"; className; children.
 */
import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type SurfaceProps = HTMLAttributes<HTMLDivElement> & {
  as?: "div" | "section";
};

export function Surface({ as: Tag = "div", className, ...props }: SurfaceProps) {
  return <Tag className={cn("rounded-xl border border-border bg-surface shadow-card", className)} {...props} />;
}
