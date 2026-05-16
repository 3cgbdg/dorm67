import { cn } from "@/lib/utils";

export function UnreadDot({ count, className }: { count: number; className?: string }) {
  if (count <= 0) return null;
  return (
    <span
      className={cn(
        "absolute flex min-h-4 min-w-4 items-center justify-center rounded-full bg-danger px-0.5 text-[10px] font-bold leading-none text-white",
        className
      )}
    >
      {count > 9 ? "9+" : count}
    </span>
  );
}
