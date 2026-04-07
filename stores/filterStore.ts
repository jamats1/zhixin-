import { create } from "zustand";
import { useUIStore } from "@/stores/uiStore";

export type FuelType =
  | "gas"
  | "diesel"
  | "electric"
  | "phev"
  | "hybrid"
  | "hydrogen"
  | null;

type VehicleView = "imageList" | "truckList";

type VehicleViewFilters = {
  selectedBrand: string | null;
  selectedType: string | null;
  selectedCategory: string | null;
  onlyOnSale: boolean;
  onlyNewEnergy: boolean;
  fuelType: FuelType;
  searchQuery: string;
  alphabeticalFilter: string | null;
};

const defaultVehicleViewFilters: VehicleViewFilters = {
  selectedBrand: null,
  selectedType: null,
  selectedCategory: null,
  onlyOnSale: false,
  onlyNewEnergy: false,
  fuelType: null,
  searchQuery: "",
  alphabeticalFilter: null,
};

export type FilterState = {
  selectedBrand: string | null;
  /** Sanity `_id` of `sparePartLine` (passenger retail model line, e.g. C-Class). */
  selectedSparePartLineId: string | null;
  selectedType: string | null;
  selectedCategory: string | null;
  /** Sanity `_id` of `carPartCategory`. */
  selectedCarPartCategory: string | null;
  onlyOnSale: boolean;
  onlyNewEnergy: boolean;
  fuelType: FuelType;
  searchQuery: string;
  alphabeticalFilter: string | null;
  currentVehicleView: VehicleView;
  vehicleViewFilters: Record<VehicleView, VehicleViewFilters>;
};

type FilterActions = {
  setBrand: (brand: string | null) => void;
  setSparePartLine: (lineId: string | null) => void;
  setType: (type: string | null) => void;
  setCategory: (category: string | null) => void;
  setCarPartCategory: (category: string | null) => void;
  setOnlyOnSale: (value: boolean) => void;
  setOnlyNewEnergy: (value: boolean) => void;
  setFuelType: (fuelType: FuelType) => void;
  setSearchQuery: (query: string) => void;
  setAlphabeticalFilter: (letter: string | null) => void;
  setVehicleView: (view: VehicleView) => void;
  resetFilters: () => void;
};

const initialState: FilterState = {
  selectedBrand: defaultVehicleViewFilters.selectedBrand,
  selectedSparePartLineId: null,
  selectedType: defaultVehicleViewFilters.selectedType,
  selectedCategory: defaultVehicleViewFilters.selectedCategory,
  selectedCarPartCategory: null,
  onlyOnSale: defaultVehicleViewFilters.onlyOnSale,
  onlyNewEnergy: defaultVehicleViewFilters.onlyNewEnergy,
  fuelType: defaultVehicleViewFilters.fuelType,
  searchQuery: defaultVehicleViewFilters.searchQuery,
  alphabeticalFilter: defaultVehicleViewFilters.alphabeticalFilter,
  currentVehicleView: "imageList",
  vehicleViewFilters: {
    imageList: { ...defaultVehicleViewFilters },
    truckList: { ...defaultVehicleViewFilters },
  },
};

export const useFilterStore = create<FilterState & FilterActions>((set) => ({
  ...initialState,
  setBrand: (brand) =>
    set({ selectedBrand: brand, selectedSparePartLineId: null }),
  setSparePartLine: (lineId) => set({ selectedSparePartLineId: lineId }),
  setType: (type) =>
    set((state) => {
      const v = state.currentVehicleView;
      const vf = state.vehicleViewFilters[v];
      return {
        selectedType: type,
        vehicleViewFilters: {
          ...state.vehicleViewFilters,
          [v]: { ...vf, selectedType: type },
        },
      };
    }),
  setCategory: (category) =>
    set((state) => {
      const v = state.currentVehicleView;
      const vf = state.vehicleViewFilters[v];
      const categoryChanged = vf.selectedCategory !== category;
      const nextType = categoryChanged ? null : vf.selectedType;
      return {
        selectedCategory: category,
        selectedType: nextType,
        vehicleViewFilters: {
          ...state.vehicleViewFilters,
          [v]: {
            ...vf,
            selectedCategory: category,
            selectedType: nextType,
          },
        },
      };
    }),
  setCarPartCategory: (category) => set({ selectedCarPartCategory: category }),
  setOnlyOnSale: (value) => set({ onlyOnSale: value }),
  setOnlyNewEnergy: (value) => set({ onlyNewEnergy: value }),
  setFuelType: (fuelType) => set({ fuelType }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setAlphabeticalFilter: (letter) => set({ alphabeticalFilter: letter }),
  setVehicleView: (view) =>
    set((state) => {
      if (state.currentVehicleView === view) return {};

      const activeView = useUIStore.getState().currentView;
      const isSwitchingFromVehicleTab =
        activeView === "imageList" || activeView === "truckList";

      const currentViewFilters: VehicleViewFilters = {
        selectedBrand: state.selectedBrand,
        selectedType: state.selectedType,
        selectedCategory: state.selectedCategory,
        onlyOnSale: state.onlyOnSale,
        onlyNewEnergy: state.onlyNewEnergy,
        fuelType: state.fuelType,
        searchQuery: state.searchQuery,
        alphabeticalFilter: state.alphabeticalFilter,
      };

      const nextVehicleViewFilters = {
        ...state.vehicleViewFilters,
        ...(isSwitchingFromVehicleTab
          ? { [state.currentVehicleView]: currentViewFilters }
          : {}),
      };

      const targetViewFilters = nextVehicleViewFilters[view];

      return {
        currentVehicleView: view,
        vehicleViewFilters: nextVehicleViewFilters,
        selectedBrand: targetViewFilters.selectedBrand,
        selectedType: targetViewFilters.selectedType,
        selectedCategory: targetViewFilters.selectedCategory,
        onlyOnSale: targetViewFilters.onlyOnSale,
        onlyNewEnergy: targetViewFilters.onlyNewEnergy,
        fuelType: targetViewFilters.fuelType,
        searchQuery: targetViewFilters.searchQuery,
        alphabeticalFilter: targetViewFilters.alphabeticalFilter,
      };
    }),
  resetFilters: () =>
    set((state) => {
      const resetVehicleFilters = { ...defaultVehicleViewFilters };
      return {
        selectedBrand: resetVehicleFilters.selectedBrand,
        selectedSparePartLineId: null,
        selectedType: resetVehicleFilters.selectedType,
        selectedCategory: resetVehicleFilters.selectedCategory,
        selectedCarPartCategory: null,
        onlyOnSale: resetVehicleFilters.onlyOnSale,
        onlyNewEnergy: resetVehicleFilters.onlyNewEnergy,
        fuelType: resetVehicleFilters.fuelType,
        searchQuery: resetVehicleFilters.searchQuery,
        alphabeticalFilter: resetVehicleFilters.alphabeticalFilter,
        vehicleViewFilters: {
          ...state.vehicleViewFilters,
          [state.currentVehicleView]: resetVehicleFilters,
        },
      };
    }),
}));
