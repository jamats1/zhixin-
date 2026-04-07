import { describe, expect, it } from "vitest";
import {
  carPartsByFiltersQuery,
  carPartsCountQuery,
  vehicleSeriesByFiltersQuery,
  vehicleSeriesCountQuery,
} from "./queries";

/** Normalize `groq` template results for assertions. */
function groqText(fragment: unknown): string {
  if (typeof fragment === "string") return fragment;
  if (
    fragment &&
    typeof fragment === "object" &&
    "query" in fragment &&
    typeof (fragment as { query: string }).query === "string"
  ) {
    return (fragment as { query: string }).query;
  }
  return JSON.stringify(fragment);
}

describe("vehicleSeriesByFiltersQuery", () => {
  it("lists vehicles with base type and slice params", () => {
    const q = groqText(vehicleSeriesByFiltersQuery({ start: 0, end: 20 }));
    expect(q).toContain('_type == "vehicle"');
    expect(q).toContain("$start");
    expect(q).toContain("$end");
  });

  it("adds on-sale predicate when onSaleFilter is true", () => {
    const q = groqText(
      vehicleSeriesByFiltersQuery({ start: 0, end: 10, onSaleFilter: true }),
    );
    expect(q).toContain("isOnSale == true");
  });

  it("adds new-energy predicate when newEnergyFilter is true", () => {
    const q = groqText(
      vehicleSeriesByFiltersQuery({
        start: 0,
        end: 10,
        newEnergyFilter: true,
      }),
    );
    expect(q).toContain("isNewEnergy == true");
  });

  it("excludes trucks when excludeTruck is set", () => {
    const q = groqText(
      vehicleSeriesByFiltersQuery({
        start: 0,
        end: 10,
        excludeTruck: true,
      }),
    );
    expect(q).toContain('vehicleSegment != "truck"');
  });

  it("matches fuel with param when fuelFilter is set", () => {
    const q = groqText(
      vehicleSeriesByFiltersQuery({
        start: 0,
        end: 10,
        fuelFilter: "Diesel",
      }),
    );
    expect(q).toContain("fuelType match $fuelFilter");
  });
});

describe("vehicleSeriesCountQuery", () => {
  it("mirrors list filters for count (on sale + segment)", () => {
    const list = groqText(
      vehicleSeriesByFiltersQuery({
        start: 0,
        end: 5,
        segmentFilter: "truck",
        onSaleFilter: true,
        fuelFilter: "Hybrid",
      }),
    );
    const count = groqText(
      vehicleSeriesCountQuery({
        segmentFilter: "truck",
        onSaleFilter: true,
        fuelFilter: "Hybrid",
      }),
    );
    expect(count.startsWith("count(")).toBe(true);
    for (const needle of [
      '_type == "vehicle"',
      "vehicleSegment == $segmentFilter",
      "isOnSale == true",
      "fuelType match $fuelFilter",
    ]) {
      expect(list).toContain(needle);
      expect(count).toContain(needle);
    }
  });
});

describe("carPartsByFiltersQuery", () => {
  it("requires in-stock when inStockFilter is true", () => {
    const q = groqText(
      carPartsByFiltersQuery({
        start: 0,
        end: 10,
        inStockFilter: true,
      }),
    );
    expect(q).toContain('_type == "carPart"');
    expect(q).toContain("inStock == true");
  });

  it("filters by brand and spare line refs", () => {
    const q = groqText(
      carPartsByFiltersQuery({
        start: 0,
        end: 10,
        brandId: "b1",
        sparePartLineId: "l1",
        inStockFilter: true,
      }),
    );
    expect(q).toContain("brand._ref == $brandId");
    expect(q).toContain("sparePartLine._ref == $sparePartLineId");
  });
});

describe("carPartsCountQuery", () => {
  it("matches carPartsByFiltersQuery conditions for count", () => {
    const filters = {
      brandId: "brand-ref",
      categoryId: "cat-ref",
      onSaleFilter: true,
      inStockFilter: true,
      searchPattern: "*bolt*",
    };
    const list = groqText(
      carPartsByFiltersQuery({ ...filters, start: 0, end: 5 }),
    );
    const count = groqText(carPartsCountQuery(filters));
    expect(count.startsWith("count(")).toBe(true);
    for (const needle of [
      "brand._ref == $brandId",
      "category._ref == $categoryId",
      "isOnSale == true",
      "inStock == true",
      "name match $searchPattern",
    ]) {
      expect(list).toContain(needle);
      expect(count).toContain(needle);
    }
  });
});
