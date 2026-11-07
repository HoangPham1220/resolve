import { create } from "zustand";
interface UIState {
  search: string;
  setSearch: (value: string) => void;
  notice: string;
  notify: (value: string) => void;
}
export const useUI = create<UIState>((set) => ({
  search: "",
  setSearch: (search) => set({ search }),
  notice: "",
  notify: (notice) => set({ notice }),
}));
