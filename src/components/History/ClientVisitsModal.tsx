import { useTranslation } from "react-i18next";
import type { FormulaHistoryEntry } from "../../history";
import { Modal } from "../common/Modal";
import { HistoryEntryCard } from "./HistoryEntryCard";
import type { ActualGramsEditor } from "./useActualGramsEditor";
import type { ClientHistoryGroup } from "./useHistoryData";

interface ClientVisitsModalProps {
  group: ClientHistoryGroup;
  isAdmin: boolean;
  gramsEditor: ActualGramsEditor;
  onClose: () => void;
  // Only opens HistoryView's delete-confirm dialog on top of this modal -- the delete
  // itself (and closing both dialogs afterwards) stays in HistoryView.
  onRequestDelete: () => void;
  onEditEntry: (entryId: string) => void;
  onOpenPhoto: (photo: { url: string; label: string }) => void;
  onRepeat: (entry: FormulaHistoryEntry) => void;
}

// One client's full visit list, opened from a ClientGroupList card. Owns no state: the
// edit/photo/delete-confirm dialogs it opens stack on top of it from HistoryView, which
// keeps every dialog's open/closed state in one place.
export function ClientVisitsModal({
  group, isAdmin, gramsEditor, onClose, onRequestDelete, onEditEntry, onOpenPhoto, onRepeat,
}: ClientVisitsModalProps) {
  const { t } = useTranslation();

  return (
    <Modal title={group.displayName} onClose={onClose} size="large">
      {isAdmin && (
        <div className="history__client-group-actions">
          <button type="button" className="button button--danger" onClick={onRequestDelete}>
            {t("history.deleteClient")}
          </button>
        </div>
      )}
      <ul className="history__entry-list">
        {group.entries.map(entry => (
          <HistoryEntryCard
            key={entry.id}
            entry={entry}
            gramsEditor={gramsEditor}
            onEdit={() => onEditEntry(entry.id)}
            onOpenPhoto={onOpenPhoto}
            onRepeat={() => onRepeat(entry)}
          />
        ))}
      </ul>
    </Modal>
  );
}
