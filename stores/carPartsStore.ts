import { create } from "zustand";
import type { CarPart } from "@/types";

type CarPartsState = {
  carParts: CarPart[];
  currentPage: number;
  totalPages: number;
  totalCount: number;
  hasMore: boolean;
  isLoading: boolean;
  error: string | null;
};

type CarPartsActions = {
  setCarParts: (carParts: CarPart[]) => void;
  appendCarParts: (carParts: CarPart[]) => void;
  setCurrentPage: (page: number) => void;
  setTotalPages: (pages: number) => void;
  setTotalCount: (count: number) => void;
  setHasMore: (hasMore: boolean) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
};

const initialState: CarPartsState = {
  carParts: [],
  currentPage: 1,
  totalPages: 1,
  totalCount: 0,
  hasMore: false,
  isLoading: false,
  error: null,
};

export const useCarPartsStore = create<CarPartsState & CarPartsActions>(
  (set) => ({
    ...initialState,
    setCarParts: (carParts) => set({ carParts }),
    appendCarParts: (carParts) =>
      set((state) => ({
        carParts: [...state.carParts, ...carParts],
      })),
    setCurrentPage: (page) => set({ currentPage: page }),
    setTotalPages: (pages) => set({ totalPages: pages }),
    setTotalCount: (count) => set({ totalCount: count }),
    setHasMore: (hasMore) => set({ hasMore }),
    setLoading: (loading) => set({ isLoading: loading }),
    setError: (error) => set({ error }),
    reset: () => set(initialState),
  }),
);
