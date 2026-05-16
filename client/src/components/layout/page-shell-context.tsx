import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

type PageShellState = {
  title: string;
  description?: string;
  setPage: (title: string, description?: string) => void;
};

const PageShellContext = createContext<PageShellState | null>(null);

export function PageShellProvider({ children }: { children: ReactNode }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState<string | undefined>(undefined);

  const setPage = useCallback((t: string, d?: string) => {
    setTitle(t);
    setDescription(d);
  }, []);

  const value = useMemo(() => ({ title, description, setPage }), [title, description, setPage]);

  return <PageShellContext.Provider value={value}>{children}</PageShellContext.Provider>;
}

export function usePageShell() {
  const ctx = useContext(PageShellContext);
  if (!ctx) throw new Error("usePageShell must be used within PageShellProvider");
  return ctx;
}
