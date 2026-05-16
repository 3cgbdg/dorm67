import { useEffect, type ReactNode } from "react";
import { applyThemeToDocument, useUiStore } from "@/store/uiStore";

/** Subscribes to theme store and keeps document class in sync. */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const theme = useUiStore((s) => s.theme);

  useEffect(() => {
    applyThemeToDocument(theme);
  }, [theme]);

  return <>{children}</>;
}
