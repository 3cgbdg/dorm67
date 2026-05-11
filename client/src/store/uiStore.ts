import { create } from "zustand";

type UiState = {
  globalLoading: boolean;
  setGlobalLoading: (loading: boolean) => void;
};

export const useUiStore = create<UiState>((set) => ({
  globalLoading: false,
  setGlobalLoading: (globalLoading) => set({ globalLoading }),
}));
