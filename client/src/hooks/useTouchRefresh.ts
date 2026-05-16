import { useCallback, useEffect, useRef, useState } from "react";

const THRESHOLD = 52;

/**
 * Document-level pull gesture when `window.scrollY` is near the top (mobile).
 * Shows a small indicator and calls `onRefresh` when released past threshold.
 */
export function useDocumentPullRefresh(onRefresh: () => void | Promise<void>) {
  const [pullPx, setPullPx] = useState(0);
  const startY = useRef(0);
  const tracking = useRef(false);
  const pullPxRef = useRef(0);
  const onRefreshRef = useRef(onRefresh);
  onRefreshRef.current = onRefresh;

  const setPull = useCallback((v: number) => {
    pullPxRef.current = v;
    setPullPx(v);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mq.matches) return;

    const onStart = (e: TouchEvent) => {
      if (window.scrollY > 8) return;
      tracking.current = true;
      startY.current = e.touches[0].clientY;
    };

    const onMove = (e: TouchEvent) => {
      if (!tracking.current || window.scrollY > 8) {
        setPull(0);
        return;
      }
      const dy = e.touches[0].clientY - startY.current;
      if (dy > 0) {
        setPull(Math.min(dy * 0.42, 96));
      } else {
        setPull(0);
      }
    };

    const onEnd = async () => {
      if (!tracking.current) return;
      tracking.current = false;
      const px = pullPxRef.current;
      setPull(0);
      if (px >= THRESHOLD) {
        await onRefreshRef.current();
      }
    };

    window.addEventListener("touchstart", onStart, { passive: true });
    window.addEventListener("touchmove", onMove, { passive: true });
    window.addEventListener("touchend", onEnd);
    return () => {
      window.removeEventListener("touchstart", onStart);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onEnd);
    };
  }, [setPull]);

  return { pullPx, threshold: THRESHOLD };
}
