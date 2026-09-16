import { useTranslation } from "react-i18next";
import { Modal } from "../common/Modal";
import "./BowlCard.css";

export interface BowlCardProps {
  clientName: string;
  formulaText: string;
  processingMinutes: number;
  onClose: () => void;
}

// A single large, print-friendly card -- composition, processing time, and client name at
// a glance -- meant to sit next to the mixing bowl instead of a phone screen a colorist
// keeps re-checking (and re-unlocking) with gloved, dye-stained hands. Opened from a tap
// on the confirmed client name in the results panel (see SessionDetailsPanel).
export function BowlCard({ clientName, formulaText, processingMinutes, onClose }: BowlCardProps) {
  const { t } = useTranslation();

  return (
    <Modal title={t("results.bowlCardTitle")} onClose={onClose} size="large">
      <div className="bowl-card">
        <p className="bowl-card__client">{clientName}</p>
        <pre className="bowl-card__formula">{formulaText}</pre>
        <p className="bowl-card__time">{t("results.bowlCardProcessingTime", { minutes: processingMinutes })}</p>
        <div className="bowl-card__actions no-print">
          <button type="button" className="button" onClick={() => window.print()}>
            {t("results.bowlCardPrint")}
          </button>
        </div>
      </div>
    </Modal>
  );
}
