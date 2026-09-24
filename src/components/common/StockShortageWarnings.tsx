import { useTranslation } from "react-i18next";
import type { StockShortage } from "../../stock";

export function StockShortageWarnings({ shortages }: { shortages: StockShortage[] }) {
  const { t } = useTranslation();
  return (
    <>
      {shortages.map(({ consumption, remainingGrams }) => (
        <p key={consumption.id} className="warning" role="alert">
          {t("results.stockShortWarning", {
            code: consumption.kind === "developer"
              ? t("format.developerVolume", { value: Number(consumption.code) })
              : consumption.code,
            remaining: remainingGrams.toFixed(1),
            needed: consumption.grams.toFixed(1),
          })}
        </p>
      ))}
    </>
  );
}
