import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { GlobalSearchDialog } from "@/components/layout/GlobalSearchDialog";

type GlobalSearchApi = {
  open: (initialQuery?: string) => void;
  close: () => void;
};

const GlobalSearchContext = createContext<GlobalSearchApi | null>(null);

function isEditableTarget(t: EventTarget | null): boolean {
  if (!(t instanceof HTMLElement)) return false;
  const tag = t.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if (t.isContentEditable) return true;
  return false;
}

export function GlobalSearchProvider({ children }: { children: ReactNode }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [initialQuery, setInitialQuery] = useState("");

  const openSearch = useCallback((q?: string) => {
    setInitialQuery(q?.trim() ?? "");
    setDialogOpen(true);
  }, []);

  const closeSearch = useCallback(() => setDialogOpen(false), []);

  const clearInitialQuery = useCallback(() => setInitialQuery(""), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        openSearch();
        return;
      }
      if (e.key === "/" && !isEditableTarget(e.target)) {
        e.preventDefault();
        openSearch();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openSearch]);

  const value = useMemo(
    () => ({ open: openSearch, close: closeSearch }),
    [openSearch, closeSearch]
  );

  return (
    <GlobalSearchContext.Provider value={value}>
      {children}
      <GlobalSearchDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        initialQuery={initialQuery}
        onConsumedInitialQuery={clearInitialQuery}
      />
    </GlobalSearchContext.Provider>
  );
}

export function useGlobalSearch(): GlobalSearchApi {
  const ctx = useContext(GlobalSearchContext);
  if (!ctx) {
    throw new Error("useGlobalSearch must be used within GlobalSearchProvider");
  }
  return ctx;
}
