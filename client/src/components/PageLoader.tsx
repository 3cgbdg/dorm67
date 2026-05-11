import { Loader2 } from "lucide-react";

export function PageLoader({ text = "Loading..." }: { text?: string }) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center space-y-4 text-muted-foreground animate-in fade-in duration-500">
      <div className="relative">
        <div className="absolute inset-0 rounded-full bg-primary/20 blur-xl animate-pulse" />
        <Loader2 className="relative h-10 w-10 animate-spin text-primary" />
      </div>
      <p className="text-sm font-medium tracking-wide animate-pulse">{text}</p>
    </div>
  );
}
