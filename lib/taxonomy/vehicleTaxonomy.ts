/**
 * Global Vehicle Taxonomy
 * Expanded beyond cars to include all vehicle types globally
 */

export type VehicleCategory = {
  id: string;
  title: string;
  slug: string;
  types: VehicleType[];
};

export type VehicleType = {
  id: string;
  title: string;
  slug: string;
  categoryId: string;
};

export const GLOBAL_VEHICLE_TAXONOMY: VehicleCategory[] = [
  {
    id: "land",
    title: "Land",
    slug: "land",
    types: [
      { id: "cars", title: "Cars", slug: "cars", categoryId: "land" },
      { id: "suvs", title: "SUVs", slug: "suvs", categoryId: "land" },
      { id: "trucks", title: "Trucks", slug: "trucks", categoryId: "land" },
      { id: "buses", title: "Buses", slug: "buses", categoryId: "land" },
      { id: "vans", title: "Vans", slug: "vans", categoryId: "land" },
      {
        id: "motorcycles",
        title: "Motorcycles",
        slug: "motorcycles",
        categoryId: "land",
      },
      {
        id: "scooters",
        title: "Scooters",
        slug: "scooters",
        categoryId: "land",
      },
      { id: "atvs", title: "ATVs", slug: "atvs", categoryId: "land" },
      { id: "rvs", title: "RVs", slug: "rvs", categoryId: "land" },
      {
        id: "construction",
        title: "Construction Vehicles",
        slug: "construction",
        categoryId: "land",
      },
      {
        id: "military",
        title: "Military Vehicles",
        slug: "military",
        categoryId: "land",
      },
    ],
  },
  {
    id: "air",
    title: "Air",
    slug: "air",
    types: [
      {
        id: "airplanes",
        title: "Airplanes",
        slug: "airplanes",
        categoryId: "air",
      },
      {
        id: "helicopters",
        title: "Helicopters",
        slug: "helicopters",
        categoryId: "air",
      },
      { id: "drones", title: "Drones", slug: "drones", categoryId: "air" },
      { id: "gliders", title: "Gliders", slug: "gliders", categoryId: "air" },
      { id: "jets", title: "Jets", slug: "jets", categoryId: "air" },
    ],
  },
  {
    id: "sea",
    title: "Sea",
    slug: "sea",
    types: [
      { id: "boats", title: "Boats", slug: "boats", categoryId: "sea" },
      { id: "ships", title: "Ships", slug: "ships", categoryId: "sea" },
      { id: "yachts", title: "Yachts", slug: "yachts", categoryId: "sea" },
      {
        id: "submarines",
        title: "Submarines",
        slug: "submarines",
        categoryId: "sea",
      },
      { id: "jetskis", title: "Jet Skis", slug: "jetskis", categoryId: "sea" },
    ],
  },
  {
    id: "rail",
    title: "Rail",
    slug: "rail",
    types: [
      { id: "trains", title: "Trains", slug: "trains", categoryId: "rail" },
      { id: "trams", title: "Trams", slug: "trams", categoryId: "rail" },
      { id: "metro", title: "Metro", slug: "metro", categoryId: "rail" },
      {
        id: "monorail",
        title: "Monorail",
        slug: "monorail",
        categoryId: "rail",
      },
    ],
  },
  {
    id: "special",
    title: "Special",
    slug: "special",
    types: [
      {
        id: "space",
        title: "Space Vehicles",
        slug: "space",
        categoryId: "special",
      },
      {
        id: "rovers",
        title: "Exploration Rovers",
        slug: "rovers",
        categoryId: "special",
      },
      {
        id: "industrial",
        title: "Industrial Machinery",
        slug: "industrial",
        categoryId: "special",
      },
      {
        id: "agricultural",
        title: "Agricultural Machinery",
        slug: "agricultural",
        categoryId: "special",
      },
    ],
  },
];

export function getVehicleTypeById(id: string): VehicleType | undefined {
  for (const category of GLOBAL_VEHICLE_TAXONOMY) {
    const type = category.types.find((t) => t.id === id);
    if (type) return type;
  }
  return undefined;
}

export function getVehicleCategoryById(
  id: string,
): VehicleCategory | undefined {
  return GLOBAL_VEHICLE_TAXONOMY.find((c) => c.id === id);
}

export function getAllVehicleTypes(): VehicleType[] {
  return GLOBAL_VEHICLE_TAXONOMY.flatMap((category) => category.types);
}
