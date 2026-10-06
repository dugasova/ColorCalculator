import { useTranslation } from "react-i18next";
import type { StockShortage } from "../../stock";
import type { DeveloperVolume } from "../../engine/levels";
import { formatDeveloperVolume } from "../../engine/formatDeveloperVolume";

export function StockShortageWarnings({ shortages }: { shortages: StockShortage[] }) {
  const { t } = useTranslation();
  return (
    <>
      {shortages.map(({ consumption, remainingGrams }) => (
        <p key={consumption.id} className="warning" role="alert">
          {t("results.stockShortWarning", {
            code: consumption.kind === "developer"
              ? formatDeveloperVolume(Number(consumption.code) as DeveloperVolume)
              : consumption.code,
            remaining: remainingGrams.toFixed(1),
            needed: consumption.grams.toFixed(1),
          })}
        </p>
      ))}
    </>
  );
}
