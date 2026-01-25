export type VehicleImage = {
  id: string;
  url: string;
  alt: string;
  type: "exterior" | "interior" | "engine" | "detail";
};

export type Vehicle = {
  id: string;
  brand: string;
  model: string;
  year: number;
  type: string;
  category: string;
  images: VehicleImage[];
  priceRange?: {
    min: number;
    max: number;
    currency: string;
  };
  specs?: {
    engine?: string;
    power?: number;
    transmission?: string;
    drivetrain?: string;
    fuelType?: string;
  };
  isOnSale: boolean;
  isNewEnergy: boolean;
  imageCount: number;
  slug?: string;
  publishedAt?: string;
};

export type VehicleCategory = {
  id: string;
  title: string;
  slug: string;
  icon?: string;
  description?: string;
  order: number;
};

export type VehicleType = {
  id: string;
  title: string;
  slug: string;
  categoryId: string;
  description?: string;
  order: number;
};

export type Brand = {
  name: string;
  count: number;
  logo?: string;
};

/** Brand from Sanity with optional logo (Sanity image object for urlFor). */
export type BrandWithLogo = {
  id: string;
  name: string;
  count: number;
  logo?: { asset?: { _ref?: string; url?: string }; [k: string]: unknown };
};
