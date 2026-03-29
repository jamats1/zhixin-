import { groq } from "next-sanity";

export const vehicleCategoriesQuery = groq`
  *[_type == "vehicleCategory"] | order(order asc) {
    _id,
    title,
    "slug": slug.current,
    icon,
    description,
    order
  }
`;

export const vehicleTypesQuery = groq`
  *[_type == "vehicleType"] | order(order asc) {
    _id,
    title,
    "slug": slug.current,
    "category": category->{
      _id,
      title,
      "slug": slug.current
    },
    description,
    order
  }
`;

// Vehicle Series (Autohome) – primary source for vehicles; filter by category, type, brand
export const vehicleSeriesByFiltersQuery = (filters: {
  categoryFilter?: string;
  typeFilter?: string;
  brandFilter?: string;
  segmentFilter?: "car" | "truck";
  excludeTruck?: boolean;
  onSaleFilter?: boolean;
  newEnergyFilter?: boolean;
  fuelFilter?: string;
  start: number;
  end: number;
}) => {
  const conditions: string[] = ['_type == "vehicle"'];
  if (filters.categoryFilter)
    conditions.push("category._ref == $categoryFilter");
  if (filters.typeFilter) conditions.push("type._ref == $typeFilter");
  if (filters.brandFilter) conditions.push("brand._ref == $brandFilter");
  if (filters.segmentFilter)
    conditions.push("vehicleSegment == $segmentFilter");
  if (filters.excludeTruck)
    conditions.push('(!defined(vehicleSegment) || vehicleSegment != "truck")');
  if (filters.onSaleFilter) conditions.push("isOnSale == true");
  if (filters.newEnergyFilter) conditions.push("isNewEnergy == true");
  // Match fuel type by substring / pattern (e.g. Petrol, Diesel, BEV, PHEV)
  if (filters.fuelFilter) conditions.push("fuelType match $fuelFilter");
  return groq`
    *[${conditions.join(" && ")}]
      | order(
          registrationYear desc,
          year desc,
          scrapedAt desc,
          _createdAt desc
        ) [$start...$end] {
      _id,
      title,
      "slug": slug.current,
      thumbnail,
      images[] { asset-> },
      priceRange,
      isOnSale,
      isNewEnergy,
      tagline,
      "category": category->{ _id, title, "slug": slug.current },
      "type": type->{ _id, title, "slug": slug.current },
      "brand": brand->{ _id, title, "slug": slug.current, logo },
      _type,
      registrationYear,
      mileage,
      fuelType,
      engineDisplacement,
      transmission,
      price,
      sku,
      images,
      bodyType,
      seats,
      doors,
      weightKg,
      batteryCapacityKwh,
      rangeKm,
      drivetrain,
      features
    }
  `;
};

export const vehicleSeriesCountQuery = (filters: {
  categoryFilter?: string;
  typeFilter?: string;
  brandFilter?: string;
  segmentFilter?: "car" | "truck";
  excludeTruck?: boolean;
  onSaleFilter?: boolean;
  newEnergyFilter?: boolean;
  fuelFilter?: string;
}) => {
  const conditions: string[] = ['_type == "vehicle"'];
  if (filters.categoryFilter)
    conditions.push("category._ref == $categoryFilter");
  if (filters.typeFilter) conditions.push("type._ref == $typeFilter");
  if (filters.brandFilter) conditions.push("brand._ref == $brandFilter");
  if (filters.segmentFilter)
    conditions.push("vehicleSegment == $segmentFilter");
  if (filters.excludeTruck)
    conditions.push('(!defined(vehicleSegment) || vehicleSegment != "truck")');
  if (filters.onSaleFilter) conditions.push("isOnSale == true");
  if (filters.newEnergyFilter) conditions.push("isNewEnergy == true");
  if (filters.fuelFilter) conditions.push("fuelType match $fuelFilter");
  return groq`count(*[${conditions.join(" && ")}])`;
};

/** Brands with vehicle-series count. Count from vehicleSeries referencing this brand. */
export const brandsQuery = groq`
  *[_type == "brand"] | order(order asc, title asc) {
    _id,
    title,
    "slug": slug.current,
    logo,
    "count": count(*[_type in ["vehicleSeries", "vehicle"] && brand._ref == ^._id]),
    isHot
  }
`;

/** BD Spares–style model lines (C-Class, Q5, …) for a Sanity brand. */
export const sparePartLinesByBrandQuery = groq`
  *[_type == "sparePartLine" && brand._ref == $brandId] | order(order asc, title asc) {
    _id,
    title,
    "slug": slug.current,
    path
  }
`;

// Car Parts Queries
export const carPartsByFiltersQuery = (filters: {
  brandFilter?: string;
  categoryFilter?: string;
  sparePartLineId?: string;
  onSaleFilter?: boolean;
  inStockFilter?: boolean;
  start: number;
  end: number;
}) => {
  const conditions: string[] = ['_type == "carPart"'];

  if (filters.brandFilter) {
    conditions.push("brand match $brandFilter");
  }
  if (filters.categoryFilter) {
    conditions.push("category == $categoryFilter");
  }
  if (filters.sparePartLineId) {
    conditions.push("sparePartLine._ref == $sparePartLineId");
  }
  if (filters.onSaleFilter) {
    conditions.push("isOnSale == true");
  }
  if (filters.inStockFilter) {
    conditions.push("inStock == true");
  }

  return groq`
    *[${conditions.join(" && ")}] | order(publishedAt desc) [$start...$end] {
      _id,
      name,
      partNumber,
      category,
      brand,
      gallery[] {
        alt,
        image { asset-> }
      },
      priceRange,
      specifications,
      description,
      isOnSale,
      inStock,
      slug,
      publishedAt
    }
  `;
};

export const carPartsCountQuery = (filters: {
  brandFilter?: string;
  categoryFilter?: string;
  sparePartLineId?: string;
  onSaleFilter?: boolean;
  inStockFilter?: boolean;
}) => {
  const conditions: string[] = ['_type == "carPart"'];

  if (filters.brandFilter) {
    conditions.push("brand match $brandFilter");
  }
  if (filters.categoryFilter) {
    conditions.push("category == $categoryFilter");
  }
  if (filters.sparePartLineId) {
    conditions.push("sparePartLine._ref == $sparePartLineId");
  }
  if (filters.onSaleFilter) {
    conditions.push("isOnSale == true");
  }
  if (filters.inStockFilter) {
    conditions.push("inStock == true");
  }

  return groq`count(*[${conditions.join(" && ")}])`;
};
