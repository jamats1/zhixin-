import { create } from "zustand";

type UIState = {
  isSidebarOpen: boolean;
  currentView: "imageList" | "truckList" | "featuredAlbums";
  isLoading: boolean;
  scrollPosition: number;
};

type UIActions = {
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setCurrentView: (
    view: "imageList" | "truckList" | "featuredAlbums",
  ) => void;
  setLoading: (loading: boolean) => void;
  setScrollPosition: (position: number) => void;
};

export const useUIStore = create<UIState & UIActions>((set) => ({
  isSidebarOpen: false, // Closed by default on mobile
  currentView: "imageList",
  isLoading: false,
  scrollPosition: 0,
  toggleSidebar: () =>
    set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
  setSidebarOpen: (open) => set({ isSidebarOpen: open }),
  setCurrentView: (view) => set({ currentView: view }),
  setLoading: (loading) => set({ isLoading: loading }),
  setScrollPosition: (position) => set({ scrollPosition: position }),
}));
