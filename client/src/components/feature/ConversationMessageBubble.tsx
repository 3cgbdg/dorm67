import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Props = {
  isMe: boolean;
  children: ReactNode;
  className?: string;
};

/** Shared bubble chrome for 1:1 chat messages. */
export function ConversationMessageBubble({ isMe, children, className }: Props) {
  return (
    <div
      className={cn(
        "relative max-w-[80%] rounded-2xl px-4 py-2 shadow-sm",
        isMe ? "rounded-tr-none bg-brand text-brand-fg" : "rounded-tl-none border border-border bg-surface text-ink",
        className
      )}
    >
      {children}
    </div>
  );
}
