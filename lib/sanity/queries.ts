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
  onSaleFilter?: boolean;
  newEnergyFilter?: boolean;
  start: number;
  end: number;
}) => {
  const conditions: string[] = ['_type == "vehicleSeries"'];
  if (filters.categoryFilter) conditions.push("category._ref == $categoryFilter");
  if (filters.typeFilter) conditions.push("type._ref == $typeFilter");
  if (filters.brandFilter) conditions.push("brand._ref == $brandFilter");
  if (filters.onSaleFilter) conditions.push("isOnSale == true");
  if (filters.newEnergyFilter) conditions.push("isNewEnergy == true");
  return groq`
    *[${conditions.join(" && ")}] | order(title asc) [$start...$end] {
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
      "brand": brand->{ _id, title, "slug": slug.current, logo }
    }
  `;
};

export const vehicleSeriesCountQuery = (filters: {
  categoryFilter?: string;
  typeFilter?: string;
  brandFilter?: string;
  onSaleFilter?: boolean;
  newEnergyFilter?: boolean;
}) => {
  const conditions: string[] = ['_type == "vehicleSeries"'];
  if (filters.categoryFilter) conditions.push("category._ref == $categoryFilter");
  if (filters.typeFilter) conditions.push("type._ref == $typeFilter");
  if (filters.brandFilter) conditions.push("brand._ref == $brandFilter");
  if (filters.onSaleFilter) conditions.push("isOnSale == true");
  if (filters.newEnergyFilter) conditions.push("isNewEnergy == true");
  return groq`count(*[${conditions.join(" && ")}])`;
};

/** Brands with vehicle-series count. Count from vehicleSeries referencing this brand. */
export const brandsQuery = groq`
  *[_type == "brand"] | order(order asc, title asc) {
    _id,
    title,
    "slug": slug.current,
    logo,
    "count": count(*[_type == "vehicleSeries" && brand._ref == ^._id])
  }
`;

// Car Parts Queries
export const carPartsByFiltersQuery = (filters: {
  brandFilter?: string;
  categoryFilter?: string;
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
        image,
        alt
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
  if (filters.onSaleFilter) {
    conditions.push("isOnSale == true");
  }
  if (filters.inStockFilter) {
    conditions.push("inStock == true");
  }

  return groq`count(*[${conditions.join(" && ")}])`;
};
