import { groq } from "next-sanity";

export const vehicleCategoriesQuery = groq`
  *[_type == "vehicleCategory"] | order(order asc) {
    _id,
    title,
    "slug": slug.current,
    icon,
    description,
    order,
    appliesToSegments
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
  searchPattern?: string;
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
  if (filters.searchPattern) {
    conditions.push(
      "(title match $searchPattern || model match $searchPattern || sku match $searchPattern || brand->title match $searchPattern)",
    );
  }
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
  searchPattern?: string;
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
  if (filters.searchPattern) {
    conditions.push(
      "(title match $searchPattern || model match $searchPattern || sku match $searchPattern || brand->title match $searchPattern)",
    );
  }
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

/** Brands with in-stock car part count (matches Car Parts listing default filter). */
export const brandsCarPartsQuery = groq`
  *[_type == "brand"] | order(order asc, title asc) {
    _id,
    title,
    "slug": slug.current,
    logo,
    "count": count(*[_type == "carPart" && inStock == true && brand._ref == ^._id]),
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
  brandId?: string;
  categoryId?: string;
  sparePartLineId?: string;
  onSaleFilter?: boolean;
  inStockFilter?: boolean;
  searchPattern?: string;
  start: number;
  end: number;
}) => {
  const conditions: string[] = ['_type == "carPart"'];

  if (filters.brandId) conditions.push("brand._ref == $brandId");
  if (filters.categoryId) conditions.push("category._ref == $categoryId");
  if (filters.sparePartLineId) {
    conditions.push("sparePartLine._ref == $sparePartLineId");
  }
  if (filters.onSaleFilter) {
    conditions.push("isOnSale == true");
  }
  if (filters.inStockFilter) {
    conditions.push("inStock == true");
  }
  if (filters.searchPattern) {
    conditions.push(
      "(name match $searchPattern || partNumber match $searchPattern || brand->title match $searchPattern || category->title match $searchPattern)",
    );
  }

  return groq`
    *[${conditions.join(" && ")}] | order(publishedAt desc) [$start...$end] {
      _id,
      name,
      partNumber,
      "category": category->{ _id, title, "slug": slug.current, sourceKey, order },
      "brand": brand->{ _id, title, "slug": slug.current, logo },
      gallery[] {
        alt,
        image { asset-> }
      },
      priceRange,
      priceZar,
      exchangeRateZarUsd,
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
  brandId?: string;
  categoryId?: string;
  sparePartLineId?: string;
  onSaleFilter?: boolean;
  inStockFilter?: boolean;
  searchPattern?: string;
}) => {
  const conditions: string[] = ['_type == "carPart"'];

  if (filters.brandId) conditions.push("brand._ref == $brandId");
  if (filters.categoryId) conditions.push("category._ref == $categoryId");
  if (filters.sparePartLineId) {
    conditions.push("sparePartLine._ref == $sparePartLineId");
  }
  if (filters.onSaleFilter) {
    conditions.push("isOnSale == true");
  }
  if (filters.inStockFilter) {
    conditions.push("inStock == true");
  }
  if (filters.searchPattern) {
    conditions.push(
      "(name match $searchPattern || partNumber match $searchPattern || brand->title match $searchPattern || category->title match $searchPattern)",
    );
  }

  return groq`count(*[${conditions.join(" && ")}])`;
};

export const carPartCategoriesQuery = groq`
  *[_type == "carPartCategory"] | order(order asc, title asc) {
    _id,
    title,
    "slug": slug.current,
    sourceKey,
    order
  }
`;
