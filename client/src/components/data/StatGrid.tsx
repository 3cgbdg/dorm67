import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function StatGrid({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("grid gap-3 sm:grid-cols-2 lg:grid-cols-4", className)}>{children}</div>;
}
