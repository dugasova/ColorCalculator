import { useState } from "react";
import { calculateProductCost, calculateRecommendedServicePrice } from "../../engine/pricing";
import { useSalonMarkupMultiplier } from "../../palette";

// Product cost and service price for one formula. Each figure has a default (the brand's
// price per gram, the salon's markup, the recommended price) that the colorist can
// replace by hand. `productGrams` is the priced dye weight, or null when there is no mix.
export function usePricing(brandPricePerGram: number, productGrams: number | null) {
  const [manualPricePerGram, setManualPricePerGram] = useState<number | undefined>(undefined);
  const salonMarkupMultiplier = useSalonMarkupMultiplier();
  const [manualMarkupMultiplier, setManualMarkupMultiplier] = useState<number | undefined>(undefined);
  const [manualServicePrice, setManualServicePrice] = useState<number | undefined>(undefined);

  const pricePerGram = manualPricePerGram ?? brandPricePerGram;
  const markupMultiplier = manualMarkupMultiplier ?? salonMarkupMultiplier;
  const productCost = productGrams !== null ? calculateProductCost(productGrams, pricePerGram) : null;
  const recommendedServicePrice =
    productCost !== null ? calculateRecommendedServicePrice(productCost, markupMultiplier) : null;
  const servicePrice = manualServicePrice ?? recommendedServicePrice;

  return {
    manualPricePerGram,
    setManualPricePerGram,
    markupMultiplier,
    setManualMarkupMultiplier,
    manualServicePrice,
    setManualServicePrice,
    pricePerGram,
    productCost,
    recommendedServicePrice,
    servicePrice,
  };
}
