import { groq } from "next-sanity";

export const vehicleQuery = groq`
  *[_type == "vehicle"] {
    _id,
    brand,
    model,
    year,
    "type": type->{
      _id,
      title,
      slug,
      "category": category->{
        _id,
        title,
        slug
      }
    },
    gallery[] {
      image,
      alt,
      imageType
    },
    priceRange,
    specs,
    isOnSale,
    isNewEnergy,
    slug,
    publishedAt
  }
`;

export const vehicleBySlugQuery = groq`
  *[_type == "vehicle" && slug.current == $slug][0] {
    _id,
    brand,
    model,
    year,
    "type": type->{
      _id,
      title,
      slug,
      "category": category->{
        _id,
        title,
        slug
      }
    },
    gallery[] {
      image,
      alt,
      imageType
    },
    priceRange,
    specs,
    isOnSale,
    isNewEnergy,
    slug,
    publishedAt
  }
`;

export const vehicleCategoriesQuery = groq`
  *[_type == "vehicleCategory"] | order(order asc) {
    _id,
    title,
    slug,
    icon,
    description,
    order
  }
`;

export const vehicleTypesQuery = groq`
  *[_type == "vehicleType"] | order(order asc) {
    _id,
    title,
    slug,
    "category": category->{
      _id,
      title,
      slug
    },
    description,
    order
  }
`;

// Base query structure - filters are added dynamically
export const vehiclesByFiltersQuery = (filters: {
  brandFilter?: string;
  typeFilter?: string;
  onSaleFilter?: boolean;
  newEnergyFilter?: boolean;
  fuelTypeFilter?: string;
  start: number;
  end: number;
}) => {
  const conditions: string[] = ['_type == "vehicle"'];

  if (filters.brandFilter) {
    conditions.push("brand match $brandFilter");
  }
  if (filters.typeFilter) {
    conditions.push("type._ref == $typeFilter");
  }
  if (filters.onSaleFilter) {
    conditions.push("isOnSale == true");
  }
  if (filters.newEnergyFilter) {
    conditions.push("isNewEnergy == true");
  }
  if (filters.fuelTypeFilter) {
    conditions.push("specs.fuelType match $fuelTypeFilter");
  }

  return groq`
    *[${conditions.join(" && ")}] | order(publishedAt desc) [$start...$end] {
      _id,
      brand,
      model,
      year,
      "type": type->{
        _id,
        title,
        slug,
        "category": category->{
          _id,
          title,
          slug
        }
      },
      gallery[] {
        image,
        alt,
        imageType
      },
      priceRange,
      specs,
      isOnSale,
      isNewEnergy,
      slug,
      publishedAt
    }
  `;
};

export const vehiclesCountQuery = (filters: {
  brandFilter?: string;
  typeFilter?: string;
  onSaleFilter?: boolean;
  newEnergyFilter?: boolean;
  fuelTypeFilter?: string;
}) => {
  const conditions: string[] = ['_type == "vehicle"'];

  if (filters.brandFilter) {
    conditions.push("brand match $brandFilter");
  }
  if (filters.typeFilter) {
    conditions.push("type._ref == $typeFilter");
  }
  if (filters.onSaleFilter) {
    conditions.push("isOnSale == true");
  }
  if (filters.newEnergyFilter) {
    conditions.push("isNewEnergy == true");
  }
  if (filters.fuelTypeFilter) {
    conditions.push("specs.fuelType match $fuelTypeFilter");
  }

  return groq`count(*[${conditions.join(" && ")}])`;
};

/** Brands with vehicle count. Logo from Sanity; count derived from vehicles matching brand title. */
export const brandsQuery = groq`
  *[_type == "brand"] | order(order asc, title asc) {
    _id,
    title,
    "slug": slug.current,
    logo,
    "count": count(*[_type == "vehicle" && brand == ^.title])
  }
`;
