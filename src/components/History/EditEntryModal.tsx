import { useState } from "react";
import { useTranslation } from "react-i18next";
import { updateHistoryEntryDetails, type FormulaHistoryEntry, type HistoryEntryDetailsResult, type PhotoEdit } from "../../history";
import { isPatchTestSufficient } from "../../patchTest";
import { usePhotoUpload, type PhotoUpload } from "../FormulaCalculator/usePhotoUpload";
import { Modal } from "../common/Modal";

export interface EditEntryModalProps {
  entry: FormulaHistoryEntry;
  onClose: () => void;
  // Called with the saved fields so the caller can merge them into its local copy of the
  // entry (same contract as setActualColorGrams's result in useActualGramsEditor).
  onSaved: (entryId: string, updated: HistoryEntryDetailsResult) => void;
}

interface PhotoSlotProps {
  inputId: string;
  label: string;
  currentUrl: string | null;
  upload: PhotoUpload;
  removed: boolean;
  onRemovedChange: (removed: boolean) => void;
}

// One before/after slot of the edit form: shows the stored photo (if any) with a remove
// button, and a file picker to add or replace it. Picking a file supersedes a pending
// removal; "Undo" backs out of whichever change is pending.
function PhotoSlot({ inputId, label, currentUrl, upload, removed, onRemovedChange }: PhotoSlotProps) {
  const { t } = useTranslation();
  // Remounts the file input to clear its selection -- an <input type="file"> can't be
  // reset through React state, and a stale selection would otherwise still show its
  // filename after "Undo".
  const [inputKey, setInputKey] = useState(0);

  const handleFileChange = (file: File | null) => {
    upload.handleChange(file);
    if (file !== null) onRemovedChange(false);
  };

  const handleUndo = () => {
    upload.handleChange(null);
    onRemovedChange(false);
    setInputKey(key => key + 1);
  };

  const showCurrent = currentUrl !== null && upload.previewUrl === null && !removed;
  const hasPendingChange = upload.previewUrl !== null || removed;

  return (
    <div className="field results__photo">
      <label htmlFor={inputId}>{label}</label>
      {showCurrent && <img className="results__photo-preview" src={currentUrl} alt={label} />}
      {upload.previewUrl !== null && <img className="results__photo-preview" src={upload.previewUrl} alt="" />}
      {removed && <p className="history__edit-photo-removed">{t("history.editPhotoWillBeRemoved")}</p>}
      <input
        key={inputKey}
        id={inputId}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={e => handleFileChange(e.target.files?.[0] ?? null)}
      />
      <div className="history__edit-photo-actions">
        {showCurrent && (
          <button type="button" className="link-button" onClick={() => onRemovedChange(true)}>
            {t("history.editPhotoRemove")}
          </button>
        )}
        {hasPendingChange && (
          <button type="button" className="link-button" onClick={handleUndo}>
            {t("history.editPhotoUndo")}
          </button>
        )}
      </div>
    </div>
  );
}

function toPhotoEdit(file: File | null, removed: boolean): PhotoEdit {
  if (file !== null) return { kind: "replace", file };
  return removed ? { kind: "remove" } : { kind: "keep" };
}

// Amends a saved visit's free-form details (note, patch test, allergies, photos) -- the
// slice of an entry that is safe to change after the fact; see updateHistoryEntryDetails
// for what is deliberately left out and why.
export function EditEntryModal({ entry, onClose, onSaved }: EditEntryModalProps) {
  const { t } = useTranslation();
  const [note, setNote] = useState(entry.note);
  const [patchTestDate, setPatchTestDate] = useState(entry.patchTestDate);
  const [allergyNotes, setAllergyNotes] = useState(entry.allergyNotes);
  const [patchTestOverride, setPatchTestOverride] = useState(entry.patchTestOverride);
  const beforePhoto = usePhotoUpload();
  const afterPhoto = usePhotoUpload();
  const [removeBefore, setRemoveBefore] = useState(false);
  const [removeAfter, setRemoveAfter] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);
  // Lazy initializer: read once at mount, same reasoning as SessionDetailsPanel's nowMs.
  const [nowMs] = useState(() => Date.now());

  // Judged against the visit's own date, not today -- correcting a typo must not let a
  // record claim a test that would not have satisfied the 48h rule on the day of service.
  // `appliedAt` is null only for an entry whose server timestamp hasn't resolved yet.
  const referenceMs = entry.appliedAt !== null ? entry.appliedAt.toDate().getTime() : nowMs;
  const patchTestOk = isPatchTestSufficient(patchTestDate, patchTestOverride, referenceMs);

  const handleSave = async () => {
    setIsSaving(true);
    setSaveError(false);
    try {
      const updated = await updateHistoryEntryDetails({
        entry,
        note,
        patchTestDate,
        allergyNotes,
        patchTestOverride,
        beforePhoto: toPhotoEdit(beforePhoto.file, removeBefore),
        afterPhoto: toPhotoEdit(afterPhoto.file, removeAfter),
      });
      onSaved(entry.id, updated);
      onClose();
    } catch (err) {
      console.error(`Failed to update history entry "${entry.id}":`, err);
      setSaveError(true);
      setIsSaving(false);
    }
  };

  return (
    <Modal title={t("history.editEntryTitle", { name: entry.clientName })} onClose={onClose}>
      <div className="field results__note">
        <label htmlFor="editNote">{t("results.noteLabel")}</label>
        <textarea
          id="editNote"
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder={t("results.notePlaceholder")}
          rows={2}
        />
      </div>

      <div className="field results__patch-test">
        <label htmlFor="editPatchTestDate">{t("results.patchTestDateLabel")}</label>
        <input
          id="editPatchTestDate"
          type="datetime-local"
          value={patchTestDate}
          onChange={e => setPatchTestDate(e.target.value)}
          aria-required={!patchTestOverride}
        />
      </div>

      <div className="field results__allergy-notes">
        <label htmlFor="editAllergyNotes">{t("results.allergyNotesLabel")}</label>
        <input
          id="editAllergyNotes"
          value={allergyNotes}
          onChange={e => setAllergyNotes(e.target.value)}
          placeholder={t("results.allergyNotesPlaceholder")}
        />
      </div>

      <label className="results__patch-test-override">
        <input type="checkbox" checked={patchTestOverride} onChange={e => setPatchTestOverride(e.target.checked)} />
        {t("results.patchTestOverrideLabel")}
      </label>

      {!patchTestOk && <p className="warning" role="alert">{t("history.editPatchTestRequired")}</p>}

      <div className="results__photos">
        <PhotoSlot
          inputId="editBeforePhoto"
          label={t("results.beforePhotoLabel")}
          currentUrl={entry.beforePhotoUrl}
          upload={beforePhoto}
          removed={removeBefore}
          onRemovedChange={setRemoveBefore}
        />
        <PhotoSlot
          inputId="editAfterPhoto"
          label={t("results.afterPhotoLabel")}
          currentUrl={entry.afterPhotoUrl}
          upload={afterPhoto}
          removed={removeAfter}
          onRemovedChange={setRemoveAfter}
        />
      </div>

      {saveError && <p className="warning" role="alert">{t("history.editSaveError")}</p>}

      <div className="history__delete-confirm-actions">
        <button type="button" className="button button--secondary" onClick={onClose} disabled={isSaving}>
          {t("common.cancel")}
        </button>
        <button type="button" className="button" onClick={() => { void handleSave(); }} disabled={isSaving || !patchTestOk}>
          {isSaving ? t("history.editSaving") : t("history.editSave")}
        </button>
      </div>
    </Modal>
  );
}
