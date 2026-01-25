import { create } from "zustand";
import {
  GLOBAL_VEHICLE_TAXONOMY,
  type VehicleCategory,
  type VehicleType,
} from "@/lib/taxonomy/vehicleTaxonomy";

type CategoryState = {
  categories: VehicleCategory[];
  selectedCategory: VehicleCategory | null;
  selectedType: VehicleType | null;
};

type CategoryActions = {
  setSelectedCategory: (category: VehicleCategory | null) => void;
  setSelectedType: (type: VehicleType | null) => void;
  getTypesByCategory: (categoryId: string) => VehicleType[];
};

export const useCategoryStore = create<CategoryState & CategoryActions>(
  (set, get) => ({
    categories: GLOBAL_VEHICLE_TAXONOMY,
    selectedCategory: null,
    selectedType: null,
    setSelectedCategory: (category) => set({ selectedCategory: category }),
    setSelectedType: (type) => set({ selectedType: type }),
    getTypesByCategory: (categoryId) => {
      const category = get().categories.find((c) => c.id === categoryId);
      return category?.types || [];
    },
  }),
);
