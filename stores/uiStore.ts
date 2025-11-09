import { create } from "zustand";

interface UIState {
  selectedPath: string | null;
  setSelectedPath: (path: string | null) => void;
  reset: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  selectedPath: null,
  setSelectedPath: (path) => set({ selectedPath: path }),
  reset: () => set({ selectedPath: null }),
}));
