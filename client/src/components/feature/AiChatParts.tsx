import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function TypingDots() {
  return (
    <div className="flex items-center gap-1 px-1 py-0.5">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-2 w-2 animate-bounce rounded-full bg-ink-soft motion-reduce:animate-none"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </div>
  );
}

type SuggestionProps = { label: string; onPick: (text: string) => void };

export function AiSuggestionChip({ label, onPick }: SuggestionProps) {
  return (
    <button
      type="button"
      onClick={() => onPick(label)}
      className="rounded-lg border border-border bg-surface px-4 py-3 text-left text-sm transition hover:bg-surface-2 motion-reduce:transition-none"
    >
      {label}
    </button>
  );
}

type BubbleProps = {
  role: "user" | "assistant";
  children: ReactNode;
  className?: string;
};

export function AiMessageBubble({ role, children, className }: BubbleProps) {
  return (
    <div
      className={cn(
        "max-w-[80%] rounded-2xl px-4 py-2.5 text-sm",
        role === "user"
          ? "bg-brand text-brand-fg rounded-br-sm"
          : "rounded-bl-sm bg-surface-2",
        className
      )}
    >
      {children}
    </div>
  );
}
