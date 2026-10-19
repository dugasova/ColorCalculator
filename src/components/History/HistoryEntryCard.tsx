import { useTranslation } from "react-i18next";
import { buildRepeatFormulaRequest, buildRepeatSessionRequest, type FormulaHistoryEntry } from "../../history";
import { formatSessionText, formatSessionSummary } from "../../formatSession";
import { usePalette } from "../../palette";
import { STRAND_ZONE_I18N_KEY } from "../../engine/strandZone";
import { ZoneProgressPreview } from "../common/ZoneProgressPreview";
import type { ActualGramsEditor } from "./useActualGramsEditor";

export interface HistoryEntryCardProps {
  entry: FormulaHistoryEntry;
  gramsEditor: ActualGramsEditor;
  onEdit: () => void;
  onOpenPhoto: (photo: { url: string; label: string }) => void;
  onRepeat: () => void;
}

function FormattedSessionText({ text }: { text: string }) {
  const lines = text.split("\n");
  return (
    <pre className="history__entry-text">
      {lines.map((line, i) => {
        const isMix = /^(Mix|Суміш|Микс)/.test(line) || /^\d+(\.\d+)?\s*(g|г)\s+(bleach|освітлювального|обесцвечивающего)/.test(line);
        return (
          <span key={i}>
            {isMix ? <strong className="history__entry-mix">{line}</strong> : line}
            {i < lines.length - 1 && "\n"}
          </span>
        );
      })}
    </pre>
  );
}

// One saved visit inside a client's visit-list modal (see ClientVisitsModal).
export function HistoryEntryCard({ entry, gramsEditor, onEdit, onOpenPhoto, onRepeat }: HistoryEntryCardProps) {
  const { t } = useTranslation();
  const brands = usePalette();
  const { gramsDrafts, savingGramsKey, handleActualGramsChange, handleActualGramsBlur } = gramsEditor;
  const canRepeat = buildRepeatFormulaRequest(entry, brands) !== null || buildRepeatSessionRequest(entry, brands) !== null;

  return (
    <li className="history__entry">
      <div className="history__entry-header">
        <strong>{entry.clientName}</strong>
        <span className="history__entry-date">
          {entry.appliedAt ? entry.appliedAt.toDate().toLocaleDateString() : ""}
        </span>
      </div>
      <p className="history__entry-summary">{formatSessionSummary(entry.steps)}</p>
      <ZoneProgressPreview steps={entry.steps} />
      <FormattedSessionText text={formatSessionText(entry.steps)} />
      {entry.steps.map((step, index) => {
        if (step.kind !== "color") return null;
        const key = `${entry.id}::${index}`;
        const computed = step.result.grams?.colorGrams ?? null;
        const persisted = typeof step.actualColorGrams === "number" ? String(step.actualColorGrams) : "";
        // A multi-zone session (color melt, root touch-up + lengths refresh, ...)
        // can have more than one color step -- lead with the zone whenever this
        // step has one (see formatStepHeader's identical reasoning) so the input
        // above the Mix breakdown it belongs to is unambiguous at a glance. Not
        // the shade code: this actual-grams figure is the step's *total* mix
        // weight, covering every shade in it (targetShade plus any additional/
        // blend shade -- see buildMixSummary), so naming just the one primary
        // code here read as claiming this input was only about that shade.
        const zoneLabel = step.strandZone !== undefined
          ? t(`fields.strandZone.${STRAND_ZONE_I18N_KEY[step.strandZone]}`)
          : null;
        return (
          <div className="history__entry-actual" key={key}>
            <label htmlFor={`actualGrams-${key}`}>
              {zoneLabel !== null
                ? t("history.actualColorGramsWithZone", { zone: zoneLabel })
                : t("history.actualColorGrams")}
            </label>
            <input
              id={`actualGrams-${key}`}
              type="number"
              min={0}
              step={1}
              value={gramsDrafts[key] ?? persisted}
              disabled={savingGramsKey === key}
              onChange={e => handleActualGramsChange(key, e.target.value)}
              onBlur={() => { void handleActualGramsBlur(entry, index); }}
            />
            {computed !== null && (
              <span className="history__entry-actual-hint">
                {t("history.computedColorGrams", { grams: computed.toFixed(1) })}
              </span>
            )}
          </div>
        );
      })}
      {(entry.productCost != null || entry.servicePrice != null) && (
        <div className="history__entry-pricing">
          {entry.productCost != null && <span>{t("results.productCost")}: {entry.productCost.toFixed(2)}</span>}
          {entry.servicePrice != null && <span>{t("results.servicePrice")}: {entry.servicePrice.toFixed(2)}</span>}
        </div>
      )}
      {entry.note && <p className="history__entry-note">{entry.note}</p>}
      {(entry.patchTestDate || entry.allergyNotes) && (
        <p className="history__entry-patch-test">
          {entry.patchTestDate && t("history.patchTestOn", { date: new Date(entry.patchTestDate).toLocaleString() })}
          {entry.patchTestDate && entry.allergyNotes && " — "}
          {entry.allergyNotes}
        </p>
      )}
      {(entry.beforePhotoUrl || entry.afterPhotoUrl) && (
        <div className="history__entry-photos">
          {entry.beforePhotoUrl && (
            <button
              type="button"
              className="history__entry-photo-button"
              onClick={() => onOpenPhoto({ url: entry.beforePhotoUrl!, label: t("results.beforePhotoLabel") })}
              aria-label={t("history.viewPhotoAria", { label: t("results.beforePhotoLabel") })}
            >
              <img src={entry.beforePhotoUrl} alt={t("results.beforePhotoLabel")} />
            </button>
          )}
          {entry.afterPhotoUrl && (
            <button
              type="button"
              className="history__entry-photo-button"
              onClick={() => onOpenPhoto({ url: entry.afterPhotoUrl!, label: t("results.afterPhotoLabel") })}
              aria-label={t("history.viewPhotoAria", { label: t("results.afterPhotoLabel") })}
            >
              <img src={entry.afterPhotoUrl} alt={t("results.afterPhotoLabel")} />
            </button>
          )}
        </div>
      )}
      <div className="history__entry-footer">
        <span>
          {t("history.appliedBy", { name: entry.appliedBy })}
          {entry.appVersion !== null && ` · ${t("history.savedInVersion", { version: entry.appVersion })}`}
        </span>
        <div className="history__entry-footer-actions">
          <button
            type="button"
            className="button button--secondary history__entry-repeat"
            onClick={onEdit}
            aria-label={t("history.editEntryAria", { date: entry.appliedAt ? entry.appliedAt.toDate().toLocaleDateString() : "" })}
          >
            {t("history.editEntry")}
          </button>
          {canRepeat && (
            <button type="button" className="button button--secondary history__entry-repeat" onClick={onRepeat}>
              {t("history.repeat")}
            </button>
          )}
        </div>
      </div>
    </li>
  );
}
