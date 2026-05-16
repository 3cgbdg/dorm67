import { Loader2 } from "lucide-react";

export function PageLoader({ text = "Loading..." }: { text?: string }) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center space-y-4 text-ink-soft">
      <div className="relative">
        <div className="absolute inset-0 animate-pulse rounded-full bg-brand/20 blur-xl" />
        <Loader2 className="relative h-10 w-10 animate-spin text-brand" />
      </div>
      <p className="animate-pulse text-sm font-medium tracking-wide">{text}</p>
    </div>
  );
}
