import { useDocumentPullRefresh } from "@/hooks/useTouchRefresh";

type Props = {
  onRefresh: () => void | Promise<void>;
};

/** Fixed hint while the user pulls from the top of the document (mobile). */
export function PullRefreshChrome({ onRefresh }: Props) {
  const { pullPx, threshold } = useDocumentPullRefresh(onRefresh);
  if (pullPx < 12) return null;
  return (
    <div
      className="pointer-events-none fixed left-1/2 top-[calc(4rem+env(safe-area-inset-top,0px))] z-40 -translate-x-1/2 rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium text-ink shadow-pop opacity-95 motion-reduce:hidden"
      aria-live="polite"
    >
      {pullPx >= threshold ? "Release to refresh" : "Pull to refresh…"}
    </div>
  );
}
