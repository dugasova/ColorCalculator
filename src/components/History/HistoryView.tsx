import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { FormulaHistoryEntry } from "../../history";
import { planClientRevisits } from "../../revisit";
import { useActualGramsEditor } from "./useActualGramsEditor";
import { useHistoryData } from "./useHistoryData";
import { RevisitReminders } from "./RevisitReminders";
import { EditEntryModal } from "./EditEntryModal";
import { Modal } from "../common/Modal";
import { ClientVisitsModal } from "./ClientVisitsModal";
import { ClientGroupList } from "./ClientGroupList";
import "./HistoryView.css";

export interface HistoryViewProps {
  onRepeat: (entry: FormulaHistoryEntry) => void;
  isAdmin: boolean;
  currentUserEmail: string;
}

export function HistoryView({ onRepeat, isAdmin, currentUserEmail }: HistoryViewProps) {
  const { t } = useTranslation();
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
  // The before/after thumbnail currently blown up full-size -- stacks on top of the
  // client's visit-list modal the same way the edit/delete dialogs above do, so a
  // stylist can zoom in on a photo without losing their place in the visit list.
  const [photoLightbox, setPhotoLightbox] = useState<{ url: string; label: string } | null>(null);
  const {
    entries, setEntries, isLoading, error, filtered, groups, profilesByClientKey,
    deleteClientGroup, deletingClientKey, deleteError,
  } = useHistoryData({ isAdmin, currentUserEmail, search });
  const gramsEditor = useActualGramsEditor(setEntries);
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
      {gramsEditor.gramsError !== null && <p className="warning" role="alert">{gramsEditor.gramsError}</p>}
      {deleteError !== null && <p className="warning" role="alert">{deleteError}</p>}
      {!isLoading && error === null && filtered.length === 0 && (
        <p className="history__status" aria-live="polite">{t(entries.length === 0 ? "history.emptyFirstRun" : "history.empty")}</p>
      )}

      <ClientGroupList groups={groups} onOpenGroup={setOpenGroupKey} />

      {openGroup !== null && (
        <ClientVisitsModal
          group={openGroup}
          isAdmin={isAdmin}
          gramsEditor={gramsEditor}
          onClose={() => setOpenGroupKey(null)}
          onRequestDelete={() => setConfirmDeleteKey(openGroup.key)}
          onEditEntry={setEditingEntryId}
          onOpenPhoto={setPhotoLightbox}
          onRepeat={onRepeat}
        />
      )}

      {editingEntry !== null && (
        <EditEntryModal
          entry={editingEntry}
          onClose={() => setEditingEntryId(null)}
          onSaved={(entryId, updated) =>
            setEntries(prev => prev.map(e => (e.id === entryId ? { ...e, ...updated } : e)))}
        />
      )}

      {photoLightbox !== null && (
        <Modal title={photoLightbox.label} onClose={() => setPhotoLightbox(null)} size="large">
          <img className="history__photo-lightbox-image" src={photoLightbox.url} alt={photoLightbox.label} />
        </Modal>
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
