import assert from "node:assert/strict";
import {
  carPartsByFiltersQuery,
  carPartsCountQuery,
  vehicleSeriesByFiltersQuery,
  vehicleSeriesCountQuery,
} from "@/lib/sanity/queries";

function includesAll(haystack: string, needles: string[]) {
  for (const n of needles) {
    assert.ok(
      haystack.includes(n),
      `Expected query to include ${JSON.stringify(n)}\n\n${haystack}`,
    );
  }
}

function testCarPartsQueries() {
  const q = carPartsByFiltersQuery({
    brandId: "brand-123",
    categoryId: "cat-123",
    searchPattern: "*bmw*",
    sparePartLineId: "line-123",
    onSaleFilter: true,
    inStockFilter: true,
    start: 0,
    end: 10,
  });
  includesAll(q, [
    '_type == "carPart"',
    "brand._ref == $brandId",
    "category._ref == $categoryId",
    "sparePartLine._ref == $sparePartLineId",
    "isOnSale == true",
    "inStock == true",
    "name match $searchPattern",
    "brand->title match $searchPattern",
    "category->title match $searchPattern",
  ]);

  const c = carPartsCountQuery({
    brandId: "brand-123",
    categoryId: "cat-123",
    searchPattern: "*bmw*",
    sparePartLineId: "line-123",
    onSaleFilter: true,
    inStockFilter: true,
  });
  includesAll(c, [
    "count(*[",
    '_type == "carPart"',
    "brand._ref == $brandId",
    "category._ref == $categoryId",
    "sparePartLine._ref == $sparePartLineId",
    "isOnSale == true",
    "inStock == true",
    "name match $searchPattern",
  ]);
}

function testVehicleQueries() {
  const q = vehicleSeriesByFiltersQuery({
    brandFilter: "brand-123",
    categoryFilter: "cat-123",
    typeFilter: "type-123",
    segmentFilter: "car",
    onSaleFilter: true,
    newEnergyFilter: true,
    fuelFilter: "Diesel",
    searchPattern: "*tesla*",
    start: 0,
    end: 10,
  });
  includesAll(q, [
    '_type == "vehicle"',
    "brand._ref == $brandFilter",
    "category._ref == $categoryFilter",
    "type._ref == $typeFilter",
    "vehicleSegment == $segmentFilter",
    "isOnSale == true",
    "isNewEnergy == true",
    "fuelType match $fuelFilter",
    "title match $searchPattern",
    "brand->title match $searchPattern",
  ]);

  const c = vehicleSeriesCountQuery({
    brandFilter: "brand-123",
    categoryFilter: "cat-123",
    typeFilter: "type-123",
    segmentFilter: "car",
    onSaleFilter: true,
    newEnergyFilter: true,
    fuelFilter: "Diesel",
    searchPattern: "*tesla*",
  });
  includesAll(c, [
    "count(*[",
    '_type == "vehicle"',
    "brand._ref == $brandFilter",
    "category._ref == $categoryFilter",
    "type._ref == $typeFilter",
    "vehicleSegment == $segmentFilter",
    "isOnSale == true",
    "isNewEnergy == true",
    "fuelType match $fuelFilter",
    "title match $searchPattern",
  ]);
}

function main() {
  testCarPartsQueries();
  testVehicleQueries();
  // eslint-disable-next-line no-console
  console.log("OK: query builders contain expected filters");
}

main();

