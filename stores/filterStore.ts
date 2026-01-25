import { create } from "zustand";

export type FuelType = "gas" | "diesel" | "electric" | "phev" | "hybrid" | "hydrogen" | null;

export type FilterState = {
  selectedBrand: string | null;
  selectedType: string | null;
  selectedCategory: string | null;
  onlyOnSale: boolean;
  onlyNewEnergy: boolean;
  fuelType: FuelType;
  searchQuery: string;
  alphabeticalFilter: string | null;
};

type FilterActions = {
  setBrand: (brand: string | null) => void;
  setType: (type: string | null) => void;
  setCategory: (category: string | null) => void;
  setOnlyOnSale: (value: boolean) => void;
  setOnlyNewEnergy: (value: boolean) => void;
  setFuelType: (fuelType: FuelType) => void;
  setSearchQuery: (query: string) => void;
  setAlphabeticalFilter: (letter: string | null) => void;
  resetFilters: () => void;
};

const initialState: FilterState = {
  selectedBrand: null,
  selectedType: null,
  selectedCategory: null,
  onlyOnSale: false,
  onlyNewEnergy: false,
  fuelType: null,
  searchQuery: "",
  alphabeticalFilter: "A",
};

export const useFilterStore = create<FilterState & FilterActions>((set) => ({
  ...initialState,
  setBrand: (brand) => set({ selectedBrand: brand }),
  setType: (type) => set({ selectedType: type }),
  setCategory: (category) => set({ selectedCategory: category }),
  setOnlyOnSale: (value) => set({ onlyOnSale: value }),
  setOnlyNewEnergy: (value) => set({ onlyNewEnergy: value }),
  setFuelType: (fuelType) => set({ fuelType }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setAlphabeticalFilter: (letter) => set({ alphabeticalFilter: letter }),
  resetFilters: () => set(initialState),
}));
