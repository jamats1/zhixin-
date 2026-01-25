import { create } from "zustand";
import type { Vehicle } from "@/types";

type GalleryState = {
  vehicles: Vehicle[];
  currentPage: number;
  totalPages: number;
  totalCount: number;
  hasMore: boolean;
  isLoading: boolean;
  error: string | null;
};

type GalleryActions = {
  setVehicles: (vehicles: Vehicle[]) => void;
  appendVehicles: (vehicles: Vehicle[]) => void;
  setCurrentPage: (page: number) => void;
  setTotalPages: (pages: number) => void;
  setTotalCount: (count: number) => void;
  setHasMore: (hasMore: boolean) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
};

const initialState: GalleryState = {
  vehicles: [],
  currentPage: 1,
  totalPages: 1,
  totalCount: 0,
  hasMore: false,
  isLoading: false,
  error: null,
};

export const useGalleryStore = create<GalleryState & GalleryActions>((set) => ({
  ...initialState,
  setVehicles: (vehicles) => set({ vehicles }),
  appendVehicles: (vehicles) =>
    set((state) => ({
      vehicles: [...state.vehicles, ...vehicles],
    })),
  setCurrentPage: (page) => set({ currentPage: page }),
  setTotalPages: (pages) => set({ totalPages: pages }),
  setTotalCount: (count) => set({ totalCount: count }),
  setHasMore: (hasMore) => set({ hasMore }),
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),
  reset: () => set(initialState),
}));
