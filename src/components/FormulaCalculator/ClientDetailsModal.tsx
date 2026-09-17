import { useTranslation } from "react-i18next";
import { Modal } from "../common/Modal";
import type { ClientLink } from "./useClientLink";
import type { PhotoUpload } from "./usePhotoUpload";
import type { SaveState } from "./SessionDetailsPanel";

export interface ClientDetailsModalProps {
  onClose: () => void;
  clientLink: ClientLink;
  note: string;
  onNoteChange: (value: string) => void;
  patchTestDate: string;
  onPatchTestDateChange: (value: string) => void;
  patchTestOverride: boolean;
  onPatchTestOverrideChange: (value: boolean) => void;
  patchTestOk: boolean;
  beforePhoto: PhotoUpload;
  afterPhoto: PhotoUpload;
  saveState: SaveState;
  onSave: () => void;
  saveDisabled: boolean;
}

// The client-name/phone/note/patch-test/allergy/photo fields plus the save action, behind
// SessionDetailsPanel's "Client details" trigger button -- see that component's own
// comment on why this lives in a modal rather than inline in the results panel.
export function ClientDetailsModal({
  onClose, clientLink, note, onNoteChange, patchTestDate, onPatchTestDateChange,
  patchTestOverride, onPatchTestOverrideChange, patchTestOk, beforePhoto, afterPhoto,
  saveState, onSave, saveDisabled,
}: ClientDetailsModalProps) {
  const { t } = useTranslation();
  const {
    clientName, handleClientNameChange, selectedClient, suggestions,
    handleSelectSuggestion, handleClearSelection, phone, setPhone, allergyNotes, setAllergyNotes,
    lastVisitCanvasText,
  } = clientLink;

  return (
    <Modal title={t("results.clientDetailsSectionTitle")} onClose={onClose}>
      <div className="field results__client-name">
        <label htmlFor="clientName">{t("results.clientNameLabel")}</label>
        <input
          id="clientName"
          value={clientName}
          onChange={e => handleClientNameChange(e.target.value)}
          placeholder={t("results.clientNamePlaceholder")}
          required
          autoComplete="off"
        />
      </div>

      {selectedClient !== null ? (
        <p className="results__client-match results__client-match--confirmed">
          {t("results.clientLinkedTo", { name: selectedClient.name })}
          {selectedClient.phone !== "" ? ` — ${selectedClient.phone}` : ""}
          {" "}
          <button type="button" className="link-button" onClick={handleClearSelection}>
            {t("results.clientNotThisPerson")}
          </button>
        </p>
      ) : suggestions.length > 0 && (
        <div className="results__client-suggestions">
          <p className="results__client-suggestions-heading">{t("results.clientSuggestionsHeading")}</p>
          <ul className="results__client-suggestions-list">
            {suggestions.map(candidate => (
              <li key={candidate.id}>
                <button type="button" className="results__client-suggestion" onClick={() => handleSelectSuggestion(candidate)}>
                  <span className="results__client-suggestion-name">{candidate.name}</span>
                  <span className="results__client-suggestion-phone">
                    {candidate.phone !== "" ? candidate.phone : t("results.clientNoPhoneOnFile")}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {lastVisitCanvasText !== null && (
        <p className="notice results__last-visit" role="status">
          <strong>{t("results.lastVisitLabel")}</strong>
          <br />
          {lastVisitCanvasText}
        </p>
      )}

      <div className="field results__client-phone">
        <label htmlFor="clientPhone">{t("results.clientPhoneLabel")}</label>
        <input
          id="clientPhone"
          type="tel"
          value={phone}
          onChange={e => setPhone(e.target.value)}
          placeholder={t("results.clientPhonePlaceholder")}
        />
      </div>

      <div className="field results__note">
        <label htmlFor="note">{t("results.noteLabel")}</label>
        <textarea
          id="note"
          value={note}
          onChange={e => onNoteChange(e.target.value)}
          placeholder={t("results.notePlaceholder")}
          rows={2}
        />
      </div>

      <div className="field results__patch-test">
        <label htmlFor="patchTestDate">{t("results.patchTestDateLabel")}</label>
        <input
          id="patchTestDate"
          type="datetime-local"
          value={patchTestDate}
          onChange={e => onPatchTestDateChange(e.target.value)}
          aria-required={!patchTestOverride}
        />
      </div>

      <div className="field results__allergy-notes">
        <label htmlFor="allergyNotes">{t("results.allergyNotesLabel")}</label>
        <input
          id="allergyNotes"
          value={allergyNotes}
          onChange={e => setAllergyNotes(e.target.value)}
          placeholder={t("results.allergyNotesPlaceholder")}
        />
      </div>

      <label className="results__patch-test-override">
        <input type="checkbox" checked={patchTestOverride} onChange={e => onPatchTestOverrideChange(e.target.checked)} />
        {t("results.patchTestOverrideLabel")}
      </label>

      {!patchTestOk && <p className="warning" role="alert">{t("results.patchTestRequired")}</p>}

      <div className="results__photos">
        <div className="field results__photo">
          <label htmlFor="beforePhoto">{t("results.beforePhotoLabel")}</label>
          <input id="beforePhoto" type="file" accept="image/*" capture="environment" onChange={e => beforePhoto.handleChange(e.target.files?.[0] ?? null)} />
          {beforePhoto.previewUrl && <img className="results__photo-preview" src={beforePhoto.previewUrl} alt="" />}
        </div>
        <div className="field results__photo">
          <label htmlFor="afterPhoto">{t("results.afterPhotoLabel")}</label>
          <input id="afterPhoto" type="file" accept="image/*" capture="environment" onChange={e => afterPhoto.handleChange(e.target.files?.[0] ?? null)} />
          {afterPhoto.previewUrl && <img className="results__photo-preview" src={afterPhoto.previewUrl} alt="" />}
        </div>
      </div>

      <div className="results__actions">
        <button
          type="button"
          className="button button--secondary"
          onClick={onSave}
          disabled={clientName.trim() === "" || saveState === "saving" || !patchTestOk || saveDisabled}
        >
          {saveState === "saved" ? t("results.saved") : saveState === "saving" ? t("results.saving") : t("results.save")}
        </button>
      </div>
      {saveState === "error" && <p className="warning" role="alert">{t("results.saveError")}</p>}
    </Modal>
  );
}
