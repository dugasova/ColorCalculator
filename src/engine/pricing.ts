export const DEFAULT_MARKUP_MULTIPLIER = 4;

// Rounds to cents so the UI never shows a repeating-decimal artifact from the
// grams * pricePerGram multiplication (e.g. 33.333333...).
export function calculateProductCost(totalGrams: number, pricePerGram: number): number {
  return Math.round(totalGrams * pricePerGram * 100) / 100;
}

export function calculateRecommendedServicePrice(productCost: number, markupMultiplier: number): number {
  return Math.round(productCost * markupMultiplier * 100) / 100;
}
