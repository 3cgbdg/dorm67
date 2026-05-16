import { create } from "zustand";

export type ThemeMode = "light" | "dark";

const THEME_KEY = "dorm67-theme";
const SIDEBAR_KEY = "dorm67-sidebar-pinned";

/** Apply `.dark` on `<html>` from explicit light/dark preference. */
export function applyThemeToDocument(mode: ThemeMode) {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("dark", mode === "dark");
}

function readStoredTheme(): ThemeMode {
  if (typeof localStorage === "undefined") return "light";
  const v = localStorage.getItem(THEME_KEY);
  if (v === "light" || v === "dark") return v;
  // Migrate legacy "system" to a fixed preference once
  if (v === "system" && typeof window !== "undefined") {
    const resolved = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    localStorage.setItem(THEME_KEY, resolved);
    return resolved;
  }
  return "light";
}

function readStoredSidebarPinned(): boolean {
  if (typeof localStorage === "undefined") return false;
  return localStorage.getItem(SIDEBAR_KEY) === "true";
}

/** Call before ReactDOM.createRoot — applies theme class synchronously. */
export function hydrateThemeClassFromStorage() {
  applyThemeToDocument(readStoredTheme());
}

type UiState = {
  globalLoading: boolean;
  setGlobalLoading: (loading: boolean) => void;

  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;

  sidebarPinned: boolean;
  setSidebarPinned: (pinned: boolean) => void;
};

export const useUiStore = create<UiState>((set, get) => ({
  globalLoading: false,
  setGlobalLoading: (globalLoading) => set({ globalLoading }),

  theme: readStoredTheme(),
  setTheme: (theme) => {
    set({ theme });
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(THEME_KEY, theme);
    }
    applyThemeToDocument(theme);
  },
  toggleTheme: () => {
    const next: ThemeMode = get().theme === "dark" ? "light" : "dark";
    get().setTheme(next);
  },

  sidebarPinned: readStoredSidebarPinned(),
  setSidebarPinned: (sidebarPinned) => {
    set({ sidebarPinned });
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(SIDEBAR_KEY, sidebarPinned ? "true" : "false");
    }
  },
}));
