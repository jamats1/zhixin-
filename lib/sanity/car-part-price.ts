/**
 * Coalesce partial Sanity `priceRange` and derive USD from ZAR when needed (BD Spares ingest).
 */
export type CarPartPriceSource = {
  priceRange?: { min?: number; max?: number; currency?: string };
  priceZar?: number;
  exchangeRateZarUsd?: number;
};

export function resolveCarPartPriceRange(
  p: CarPartPriceSource,
): { min: number; max: number; currency: string } | undefined {
  let min = p.priceRange?.min;
  let max = p.priceRange?.max;
  const currency = p.priceRange?.currency ?? "USD";

  if (min != null && max == null) max = min;
  if (max != null && min == null) min = max;

  if (
    (min == null || max == null) &&
    p.priceZar != null &&
    p.priceZar > 0 &&
    p.exchangeRateZarUsd != null &&
    p.exchangeRateZarUsd > 0
  ) {
    const usd = Math.round(p.priceZar * p.exchangeRateZarUsd * 100) / 100;
    min = usd;
    max = usd;
  }

  if (min == null || max == null) return undefined;
  if (!Number.isFinite(min) || !Number.isFinite(max)) return undefined;

  return { min, max, currency };
}
