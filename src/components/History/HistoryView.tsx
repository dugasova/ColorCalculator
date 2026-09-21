import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { buildRepeatFormulaRequest, type FormulaHistoryEntry } from "../../history";
import { formatSessionText, formatSessionSummary } from "../../formatSession";
import { planClientRevisits } from "../../revisit";
import { usePalette } from "../../palette";
import { useActualGramsEditor } from "./useActualGramsEditor";
import { useHistoryData } from "./useHistoryData";
import { RevisitReminders } from "./RevisitReminders";
import { EditEntryModal } from "./EditEntryModal";
import { Modal } from "../common/Modal";
import "../FormulaCalculator/FormulaCalculator.css";
import "./HistoryView.css";

export interface HistoryViewProps {
  onRepeat: (entry: FormulaHistoryEntry) => void;
  isAdmin: boolean;
  currentUserEmail: string;
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

export function HistoryView({ onRepeat, isAdmin, currentUserEmail }: HistoryViewProps) {
  const { t } = useTranslation();
  const brands = usePalette();
  const [search, setSearch] = useState("");
  const [nowMs] = useState(() => Date.now());
  // The one client card currently expanded into a modal -- null means every card is
  // collapsed. A client's full visit list (formula, pricing, photos, ...) needs real
  // screen space to stay readable, so it opens in a Modal instead of an inline accordion.
  const [openGroupKey, setOpenGroupKey] = useState<string | null>(null);
  // Set only while the admin-only confirm dialog is open, to the key of the group it's
  // asking about -- separate from `openGroupKey` so the confirm dialog can stack on top
  // of (and, on cancel, fall back to) the still-open client visit-list modal beneath it.
  const [confirmDeleteKey, setConfirmDeleteKey] = useState<string | null>(null);
  // The one visit whose details are being amended in the edit dialog -- stacks on top of
  // the client's visit-list modal the same way the delete confirm above does.
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const {
    entries, setEntries, isLoading, error, filtered, groups, profilesByClientKey,
    deleteClientGroup, deletingClientKey, deleteError,
  } = useHistoryData({ isAdmin, currentUserEmail, search });
  const { gramsDrafts, savingGramsKey, gramsError, handleActualGramsChange, handleActualGramsBlur } =
    useActualGramsEditor(setEntries);
  const revisitPlans = useMemo(() => planClientRevisits(entries), [entries]);

  const openGroup = groups.find(g => g.key === openGroupKey) ?? null;
  const confirmDeleteGroup = groups.find(g => g.key === confirmDeleteKey) ?? null;
  // Looked up from the live `entries` (not `filtered`/`groups`) so the edit dialog survives
  // the search box changing underneath it.
  const editingEntry = entries.find(e => e.id === editingEntryId) ?? null;

  const handleConfirmDelete = async () => {
    if (confirmDeleteGroup === null) return;
    const deleted = await deleteClientGroup(confirmDeleteGroup);
    if (deleted) {
      setConfirmDeleteKey(null);
      setOpenGroupKey(null);
    }
  };

  return (
    <div className="calculator">
      <h1 className="calculator__title">{t("history.titlePrefix")} <span className="calculator__title-accent">{t("history.titleAccent")}</span></h1>

      {!isLoading && error === null && (
        <RevisitReminders revisitPlans={revisitPlans} profilesByClientKey={profilesByClientKey} nowMs={nowMs} />
      )}

      <div className="field">
        <label htmlFor="historySearch">{t("history.searchLabel")}</label>
        <input
          id="historySearch"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={t("history.searchPlaceholder")}
        />
      </div>

      {isLoading && <p className="history__status" aria-live="polite">{t("history.loading")}</p>}
      {error !== null && <p className="warning" role="alert">{error}</p>}
      {gramsError !== null && <p className="warning" role="alert">{gramsError}</p>}
      {deleteError !== null && <p className="warning" role="alert">{deleteError}</p>}
      {!isLoading && error === null && filtered.length === 0 && (
        <p className="history__status" aria-live="polite">{t("history.empty")}</p>
      )}

      <ul className="history__list">
        {groups.map(group => (
          <li key={group.key}>
            <div className="history__client-group">
              <button
                type="button"
                className="history__client-group-summary"
                onClick={() => setOpenGroupKey(group.key)}
                aria-haspopup="dialog"
              >
                <span className="history__client-group-name">{group.displayName}</span>
                <span className="history__client-group-meta">
                  {t("history.visitCount", { count: group.entries.length })}
                  {group.entries[0].appliedAt &&
                    ` · ${t("history.lastVisit", { date: group.entries[0].appliedAt.toDate().toLocaleDateString() })}`}
                </span>
                {group.profile !== null && (group.profile.phone !== "" || group.profile.allergyNotes !== "") && (
                  <span className="history__client-group-contact">
                    {group.profile.phone !== "" && <span>{t("results.clientPhoneLabel")}: {group.profile.phone}</span>}
                    {group.profile.allergyNotes !== "" && <span>{t("results.allergyNotesLabel")}: {group.profile.allergyNotes}</span>}
                  </span>
                )}
              </button>
            </div>
          </li>
        ))}
      </ul>

      {openGroup !== null && (
        <Modal title={openGroup.displayName} onClose={() => setOpenGroupKey(null)} size="large">
          {isAdmin && (
            <div className="history__client-group-actions">
              <button
                type="button"
                className="button button--danger"
                onClick={() => setConfirmDeleteKey(openGroup.key)}
              >
                {t("history.deleteClient")}
              </button>
            </div>
          )}
          <ul className="history__entry-list">
            {openGroup.entries.map(entry => {
              const repeatRequest = buildRepeatFormulaRequest(entry, brands);
              return (
                <li key={entry.id} className="history__entry">
                  <div className="history__entry-header">
                    <strong>{entry.clientName}</strong>
                    <span className="history__entry-date">
                      {entry.appliedAt ? entry.appliedAt.toDate().toLocaleDateString() : ""}
                    </span>
                  </div>
                  <p className="history__entry-summary">{formatSessionSummary(entry.steps)}</p>
                  <FormattedSessionText text={formatSessionText(entry.steps)} />
                  {entry.steps.map((step, index) => {
                    if (step.kind !== "color") return null;
                    const key = `${entry.id}::${index}`;
                    const computed = step.result.grams?.colorGrams ?? null;
                    const persisted = typeof step.actualColorGrams === "number" ? String(step.actualColorGrams) : "";
                    return (
                      <div className="history__entry-actual" key={key}>
                        <label htmlFor={`actualGrams-${key}`}>
                          {t("history.actualColorGrams", { code: step.targetShade.code })}
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
                      {entry.beforePhotoUrl && <img src={entry.beforePhotoUrl} alt={t("results.beforePhotoLabel")} />}
                      {entry.afterPhotoUrl && <img src={entry.afterPhotoUrl} alt={t("results.afterPhotoLabel")} />}
                    </div>
                  )}
                  <div className="history__entry-footer">
                    <span>{t("history.appliedBy", { name: entry.appliedBy })}</span>
                    <div className="history__entry-footer-actions">
                      <button
                        type="button"
                        className="button button--secondary history__entry-repeat"
                        onClick={() => setEditingEntryId(entry.id)}
                        aria-label={t("history.editEntryAria", { date: entry.appliedAt ? entry.appliedAt.toDate().toLocaleDateString() : "" })}
                      >
                        {t("history.editEntry")}
                      </button>
                      {repeatRequest !== null && (
                        <button type="button" className="button button--secondary history__entry-repeat" onClick={() => onRepeat(entry)}>
                          {t("history.repeat")}
                        </button>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </Modal>
      )}

      {editingEntry !== null && (
        <EditEntryModal
          entry={editingEntry}
          onClose={() => setEditingEntryId(null)}
          onSaved={(entryId, updated) =>
            setEntries(prev => prev.map(e => (e.id === entryId ? { ...e, ...updated } : e)))}
        />
      )}

      {confirmDeleteGroup !== null && (
        <Modal
          title={t("history.deleteClientConfirmTitle", { name: confirmDeleteGroup.displayName })}
          onClose={() => setConfirmDeleteKey(null)}
        >
          <p>{t("history.deleteClientConfirmBody", { name: confirmDeleteGroup.displayName, count: confirmDeleteGroup.entries.length })}</p>
          <div className="history__delete-confirm-actions">
            <button
              type="button"
              className="button button--secondary"
              onClick={() => setConfirmDeleteKey(null)}
              disabled={deletingClientKey === confirmDeleteGroup.key}
            >
              {t("common.cancel")}
            </button>
            <button
              type="button"
              className="button button--danger"
              onClick={() => { void handleConfirmDelete(); }}
              disabled={deletingClientKey === confirmDeleteGroup.key}
            >
              {deletingClientKey === confirmDeleteGroup.key ? t("history.deletingClient") : t("history.deleteClientConfirmButton")}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
