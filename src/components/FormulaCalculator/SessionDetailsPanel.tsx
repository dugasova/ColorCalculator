import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ProcessingTimer } from "./ProcessingTimer";

export interface SessionDetails {
  clientName: string;
  note: string;
  patchTestDate: string;
  allergyNotes: string;
  patchTestOverride: boolean;
  beforePhotoFile: File | null;
  afterPhotoFile: File | null;
}

export interface SessionDetailsPanelProps {
  formulaText: string;
  processingMinutes: number;
  onSave: (details: SessionDetails) => Promise<void>;
  // Extra condition (beyond client name + patch test) the caller may need to gate saving on
  // — e.g. a complex-coloring session needs at least one step before it's savable.
  saveDisabled?: boolean;
}

const COPIED_FEEDBACK_MS = 1500;
const SAVED_FEEDBACK_MS = 1500;
const PATCH_TEST_MIN_HOURS = 48;

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

// Client name/note/patch-test/photos + copy/share/save actions, shared by any calculator
// that produces a formula text and a set of history-savable fields: the single-formula
// FormulaResults panel and the multi-step Complex Coloring session both compute their own
// formula/pricing, then hand off to this panel for the client-facing wrap-up.
export function SessionDetailsPanel({ formulaText, processingMinutes, onSave, saveDisabled }: SessionDetailsPanelProps) {
  const { t } = useTranslation();
  const [isCopied, setIsCopied] = useState(false);
  const [clientName, setClientName] = useState("");
  const [note, setNote] = useState("");
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [patchTestDate, setPatchTestDate] = useState("");
  const [allergyNotes, setAllergyNotes] = useState("");
  const [patchTestOverride, setPatchTestOverride] = useState(false);
  const [beforePhotoFile, setBeforePhotoFile] = useState<File | null>(null);
  const [afterPhotoFile, setAfterPhotoFile] = useState<File | null>(null);
  const [beforePhotoPreviewUrl, setBeforePhotoPreviewUrl] = useState<string | null>(null);
  const [afterPhotoPreviewUrl, setAfterPhotoPreviewUrl] = useState<string | null>(null);
  // Lazy initializer runs once at mount — the one React-sanctioned place to read the
  // (impure) system clock during render. A 48h-threshold check doesn't need finer
  // freshness than "when this form was opened".
  const [nowMs] = useState(() => Date.now());

  // Release the blob: preview URLs when the component unmounts (per-selection swaps are
  // already revoked synchronously in the change handlers below).
  useEffect(() => {
    return () => {
      if (beforePhotoPreviewUrl) URL.revokeObjectURL(beforePhotoPreviewUrl);
      if (afterPhotoPreviewUrl) URL.revokeObjectURL(afterPhotoPreviewUrl);
    };
  }, [beforePhotoPreviewUrl, afterPhotoPreviewUrl]);

  const patchTestOk = patchTestOverride || (
    patchTestDate !== '' && nowMs - new Date(patchTestDate).getTime() >= PATCH_TEST_MIN_HOURS * 60 * 60 * 1000
  );

  const handleCopy = async () => {
    await navigator.clipboard.writeText(formulaText);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), COPIED_FEEDBACK_MS);
  };

  const handleShareWhatsApp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(formulaText)}`, '_blank', 'noopener,noreferrer');
  };

  const handleShareTelegram = () => {
    window.open(`https://t.me/share/url?url=&text=${encodeURIComponent(formulaText)}`, '_blank', 'noopener,noreferrer');
  };

  const handleBeforePhotoChange = (file: File | null) => {
    if (beforePhotoPreviewUrl) URL.revokeObjectURL(beforePhotoPreviewUrl);
    setBeforePhotoFile(file);
    setBeforePhotoPreviewUrl(file ? URL.createObjectURL(file) : null);
  };

  const handleAfterPhotoChange = (file: File | null) => {
    if (afterPhotoPreviewUrl) URL.revokeObjectURL(afterPhotoPreviewUrl);
    setAfterPhotoFile(file);
    setAfterPhotoPreviewUrl(file ? URL.createObjectURL(file) : null);
  };

  const handleSave = async () => {
    setSaveState('saving');
    try {
      await onSave({
        clientName: clientName.trim(),
        note: note.trim(),
        patchTestDate,
        allergyNotes,
        patchTestOverride,
        beforePhotoFile,
        afterPhotoFile,
      });
      setSaveState('saved');
      setTimeout(() => setSaveState('idle'), SAVED_FEEDBACK_MS);
    } catch {
      setSaveState('error');
    }
  };

  return (
    <>
      <ProcessingTimer minutes={processingMinutes} />

      <h2 className="results__section-heading">{t('results.clientDetailsSectionTitle')}</h2>

      <div className="field results__client-name">
        <label htmlFor="clientName">{t('results.clientNameLabel')}</label>
        <input
          id="clientName"
          value={clientName}
          onChange={e => setClientName(e.target.value)}
          placeholder={t('results.clientNamePlaceholder')}
        />
      </div>

      <div className="field results__note">
        <label htmlFor="note">{t('results.noteLabel')}</label>
        <textarea
          id="note"
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder={t('results.notePlaceholder')}
          rows={2}
        />
      </div>

      <div className="field results__patch-test">
        <label htmlFor="patchTestDate">{t('results.patchTestDateLabel')}</label>
        <input
          id="patchTestDate"
          type="datetime-local"
          value={patchTestDate}
          onChange={e => setPatchTestDate(e.target.value)}
        />
      </div>

      <div className="field results__allergy-notes">
        <label htmlFor="allergyNotes">{t('results.allergyNotesLabel')}</label>
        <input
          id="allergyNotes"
          value={allergyNotes}
          onChange={e => setAllergyNotes(e.target.value)}
          placeholder={t('results.allergyNotesPlaceholder')}
        />
      </div>

      <label className="results__patch-test-override">
        <input type="checkbox" checked={patchTestOverride} onChange={e => setPatchTestOverride(e.target.checked)} />
        {t('results.patchTestOverrideLabel')}
      </label>

      {!patchTestOk && <p className="warning">{t('results.patchTestRequired')}</p>}

      <div className="results__photos">
        <div className="field results__photo">
          <label htmlFor="beforePhoto">{t('results.beforePhotoLabel')}</label>
          <input id="beforePhoto" type="file" accept="image/*" onChange={e => handleBeforePhotoChange(e.target.files?.[0] ?? null)} />
          {beforePhotoPreviewUrl && <img className="results__photo-preview" src={beforePhotoPreviewUrl} alt="" />}
        </div>
        <div className="field results__photo">
          <label htmlFor="afterPhoto">{t('results.afterPhotoLabel')}</label>
          <input id="afterPhoto" type="file" accept="image/*" onChange={e => handleAfterPhotoChange(e.target.files?.[0] ?? null)} />
          {afterPhotoPreviewUrl && <img className="results__photo-preview" src={afterPhotoPreviewUrl} alt="" />}
        </div>
      </div>

      <div className="results__actions">
        <button type="button" className="button" onClick={handleCopy}>
          {isCopied ? t('results.copied') : t('results.copy')}
        </button>
        <button
          type="button"
          className="button button--secondary"
          onClick={handleSave}
          disabled={clientName.trim() === '' || saveState === 'saving' || !patchTestOk || saveDisabled === true}
        >
          {saveState === 'saved' ? t('results.saved') : saveState === 'saving' ? t('results.saving') : t('results.save')}
        </button>
      </div>
      {saveState === 'error' && <p className="warning">{t('results.saveError')}</p>}

      <div className="results__share">
        <button type="button" className="button button--share button--whatsapp" onClick={handleShareWhatsApp}>
          {t('results.shareWhatsApp')}
        </button>
        <button type="button" className="button button--share button--telegram" onClick={handleShareTelegram}>
          {t('results.shareTelegram')}
        </button>
      </div>
    </>
  );
}
