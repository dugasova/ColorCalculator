import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ProcessingTimer } from "./ProcessingTimer";
import { Modal } from "../common/Modal";
import { fetchClients, upsertClient, type ClientProfile } from "../../clients";
import { normalizeClientKey } from "../../revisit";
import { formatCanvasText } from "../../formatSession";
import type { HairCanvas } from "../../engine/canvas";

export interface SessionDetails {
  clientName: string;
  note: string;
  phone: string;
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
  // Called once the "Saved!" confirmation has finished showing - lets the caller reset
  // the whole form (this panel's own fields plus the brand/shade/level state above it) so
  // the next client starts from a blank calculator instead of the just-saved one's values.
  onSaved?: () => void;
  // The signed-in stylist's own email -- scopes the saved-client lookup/upsert (see
  // clients.ts) to their own book, same ownership boundary as formulaHistory's `appliedBy`.
  appliedBy: string;
  // The session's current hair canvas (porosity/thickness/chemical history), carried
  // forward onto the client's profile as their "last known" canvas on save. Not itself
  // editable here -- it's entered at the top of the calculator, well before this panel's
  // client-name field exists to match against.
  canvas?: HairCanvas;
}

const COPIED_FEEDBACK_MS = 1500;
const SAVED_FEEDBACK_MS = 1500;
const PATCH_TEST_MIN_HOURS = 48;

type SaveState = "idle" | "saving" | "saved" | "error";

// Copy/share actions (need only the already-computed formula text) plus the
// client name/note/patch-test/photos + save action (need a real client identity), shared
// by any calculator that produces a formula text and a set of history-savable fields: the
// single-formula FormulaResults panel and the multi-step Complex Coloring session both
// compute their own formula/pricing, then hand off to this panel for the client-facing
// wrap-up. The client/visit fields live behind a modal (opened from a trigger button)
// rather than inline in the results panel -- they're a distinct, only-needed-once-per-save
// task, and previously took up permanent scroll space (plus two photo pickers) even before
// a colorist was ready to save.
export function SessionDetailsPanel({ formulaText, processingMinutes, onSave, saveDisabled, onSaved, appliedBy, canvas }: SessionDetailsPanelProps) {
  const { t } = useTranslation();
  const [isCopied, setIsCopied] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [clientName, setClientName] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [patchTestDate, setPatchTestDate] = useState("");
  const [allergyNotes, setAllergyNotes] = useState("");
  const [patchTestOverride, setPatchTestOverride] = useState(false);
  const [beforePhotoFile, setBeforePhotoFile] = useState<File | null>(null);
  const [afterPhotoFile, setAfterPhotoFile] = useState<File | null>(null);
  const [beforePhotoPreviewUrl, setBeforePhotoPreviewUrl] = useState<string | null>(null);
  const [afterPhotoPreviewUrl, setAfterPhotoPreviewUrl] = useState<string | null>(null);
  const [savedClients, setSavedClients] = useState<ClientProfile[]>([]);
  // Lazy initializer runs once at mount — the one React-sanctioned place to read the
  // (impure) system clock during render. A 48h-threshold check doesn't need finer
  // freshness than "when this form was opened".
  const [nowMs] = useState(() => Date.now());
  // Both feedback timers below are plain setTimeout calls fired from event handlers, not
  // tied to a render's dependencies the way an effect's own timer would be -- tracked in
  // refs purely so the unmount cleanup effect just below can cancel a still-pending one,
  // the same concern the photo-preview-URL cleanup handles for its own resource.
  const copyFeedbackTimeoutRef = useRef<number | undefined>(undefined);
  const saveFeedbackTimeoutRef = useRef<number | undefined>(undefined);

  // Release the blob: preview URLs when the component unmounts (per-selection swaps are
  // already revoked synchronously in the change handlers below).
  useEffect(() => {
    return () => {
      if (beforePhotoPreviewUrl) URL.revokeObjectURL(beforePhotoPreviewUrl);
      if (afterPhotoPreviewUrl) URL.revokeObjectURL(afterPhotoPreviewUrl);
    };
  }, [beforePhotoPreviewUrl, afterPhotoPreviewUrl]);

  // Cancels a still-pending copy/save feedback timer on unmount -- e.g. the colorist
  // switches away from this view (or the parent remounts the whole calculator) before the
  // 1.5s window elapses. Without this, the timer still fires and calls setState (and, for
  // the save timer, the caller's onSaved) against a component that's already gone.
  useEffect(() => {
    return () => {
      clearTimeout(copyFeedbackTimeoutRef.current);
      clearTimeout(saveFeedbackTimeoutRef.current);
    };
  }, []);

  // Loads once per mount, not gated on the details modal being open -- so the
  // autocomplete/autofill below is ready the instant the colorist opens it, with no
  // extra loading flicker. Cheap: one stylist's own client book, not the whole salon's.
  useEffect(() => {
    let cancelled = false;
    fetchClients(appliedBy)
      .then(list => { if (!cancelled) setSavedClients(list); })
      .catch(err => console.error("Failed to load saved clients:", err));
    return () => { cancelled = true; };
  }, [appliedBy]);

  // An exact (normalized) name match against the stylist's own saved clients -- feeds the
  // "last visit" hint below.
  const matchedClient = useMemo(() => {
    const key = normalizeClientKey(clientName);
    if (key === "") return null;
    return savedClients.find(c => normalizeClientKey(c.name) === key) ?? null;
  }, [clientName, savedClients]);

  // Carries a matched client's phone/allergy notes forward so the colorist doesn't retype
  // them every visit -- only into fields still blank, so it never clobbers something
  // already typed this visit (e.g. a fresh allergy note for today). Driven directly by the
  // name field's own change event (fires identically whether typed or picked from the
  // <datalist>) rather than an effect watching `clientName`/`savedClients`, so it runs
  // exactly once per actual edit instead of setting state from within an effect.
  const handleClientNameChange = (value: string) => {
    setClientName(value);
    const key = normalizeClientKey(value);
    if (key === "") return;
    const match = savedClients.find(c => normalizeClientKey(c.name) === key);
    if (match === undefined) return;
    setPhone(prev => (prev === "" ? match.phone : prev));
    setAllergyNotes(prev => (prev === "" ? match.allergyNotes : prev));
  };

  // Purely informational -- the canvas fields live at the top of the calculator, entered
  // well before a client is even picked here, so there's no live value to overwrite. This
  // just lets the colorist sanity-check what they set against what was recorded last time.
  const lastVisitCanvasText = matchedClient?.lastCanvas ? formatCanvasText(matchedClient.lastCanvas) : null;

  const patchTestOk = patchTestOverride || (
    patchTestDate !== "" && nowMs - new Date(patchTestDate).getTime() >= PATCH_TEST_MIN_HOURS * 60 * 60 * 1000
  );

  const handleCopy = async () => {
    await navigator.clipboard.writeText(formulaText);
    setIsCopied(true);
    clearTimeout(copyFeedbackTimeoutRef.current);
    copyFeedbackTimeoutRef.current = setTimeout(() => setIsCopied(false), COPIED_FEEDBACK_MS);
  };

  const handleShareWhatsApp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(formulaText)}`, "_blank", "noopener,noreferrer");
  };

  const handleShareTelegram = () => {
    // t.me/share/url requires a non-empty `url` -- an empty one makes Telegram bounce
    // to telegram.org instead of opening the share/contact picker. There's no official
    // "share plain text" endpoint, so the formula text goes in `url` itself (Telegram
    // renders it as the shared message, same trick used for chat/link previews).
    window.open(`https://t.me/share/url?url=${encodeURIComponent(formulaText)}`, "_blank", "noopener,noreferrer");
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
    setSaveState("saving");
    try {
      await onSave({
        clientName: clientName.trim(),
        note: note.trim(),
        phone: phone.trim(),
        patchTestDate,
        allergyNotes,
        patchTestOverride,
        beforePhotoFile,
        afterPhotoFile,
      });
      try {
        await upsertClient({
          ownedBy: appliedBy,
          name: clientName.trim(),
          phone: phone.trim(),
          allergyNotes,
          canvas: canvas ?? null,
        });
      } catch (err) {
        // The formula itself is already saved above -- losing the client-profile upsert
        // (phone/allergy-notes/canvas carried forward to the *next* visit) shouldn't
        // surface as a save failure to the colorist. Same best-effort trade-off as the
        // photo-upload attach in saveFormulaToHistory; logged so it's traceable.
        console.error("Saved formula, but updating the client profile failed:", err);
      }
      setSaveState("saved");
      clearTimeout(saveFeedbackTimeoutRef.current);
      saveFeedbackTimeoutRef.current = setTimeout(() => { setSaveState("idle"); setIsDetailsModalOpen(false); onSaved?.(); }, SAVED_FEEDBACK_MS);
    } catch {
      setSaveState("error");
    }
  };

  return (
    <>
      <ProcessingTimer minutes={processingMinutes} />

      <div className="results__actions">
        <button type="button" className="button" onClick={handleCopy}>
          {isCopied ? t("results.copied") : t("results.copy")}
        </button>
      </div>

      <div className="results__share">
        <button type="button" className="button button--share button--whatsapp" onClick={handleShareWhatsApp}>
          {t("results.shareWhatsApp")}
        </button>
        <button type="button" className="button button--share button--telegram" onClick={handleShareTelegram}>
          {t("results.shareTelegram")}
        </button>
      </div>

      <div className="results__client-summary">
        <button
          type="button"
          className="button button--secondary results__client-summary-trigger"
          onClick={() => setIsDetailsModalOpen(true)}
        >
          {t("results.clientDetailsSectionTitle")}
        </button>
        {clientName.trim() !== "" && <p className="results__client-summary-name">{clientName.trim()}</p>}
        {clientName.trim() !== "" && !patchTestOk && <p className="warning" role="alert">{t("results.patchTestRequired")}</p>}
      </div>

      {isDetailsModalOpen && (
        <Modal title={t("results.clientDetailsSectionTitle")} onClose={() => setIsDetailsModalOpen(false)}>
          <div className="field results__client-name">
            <label htmlFor="clientName">{t("results.clientNameLabel")}</label>
            <input
              id="clientName"
              list="savedClientNames"
              value={clientName}
              onChange={e => handleClientNameChange(e.target.value)}
              placeholder={t("results.clientNamePlaceholder")}
              required
            />
            <datalist id="savedClientNames">
              {savedClients.map(c => <option key={c.id} value={c.name} />)}
            </datalist>
          </div>

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
              onChange={e => setNote(e.target.value)}
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
              onChange={e => setPatchTestDate(e.target.value)}
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
            <input type="checkbox" checked={patchTestOverride} onChange={e => setPatchTestOverride(e.target.checked)} />
            {t("results.patchTestOverrideLabel")}
          </label>

          {!patchTestOk && <p className="warning" role="alert">{t("results.patchTestRequired")}</p>}

          <div className="results__photos">
            <div className="field results__photo">
              <label htmlFor="beforePhoto">{t("results.beforePhotoLabel")}</label>
              <input id="beforePhoto" type="file" accept="image/*" capture="environment" onChange={e => handleBeforePhotoChange(e.target.files?.[0] ?? null)} />
              {beforePhotoPreviewUrl && <img className="results__photo-preview" src={beforePhotoPreviewUrl} alt="" />}
            </div>
            <div className="field results__photo">
              <label htmlFor="afterPhoto">{t("results.afterPhotoLabel")}</label>
              <input id="afterPhoto" type="file" accept="image/*" capture="environment" onChange={e => handleAfterPhotoChange(e.target.files?.[0] ?? null)} />
              {afterPhotoPreviewUrl && <img className="results__photo-preview" src={afterPhotoPreviewUrl} alt="" />}
            </div>
          </div>

          <div className="results__actions">
            <button
              type="button"
              className="button button--secondary"
              onClick={handleSave}
              disabled={clientName.trim() === "" || saveState === "saving" || !patchTestOk || saveDisabled === true}
            >
              {saveState === "saved" ? t("results.saved") : saveState === "saving" ? t("results.saving") : t("results.save")}
            </button>
          </div>
          {saveState === "error" && <p className="warning" role="alert">{t("results.saveError")}</p>}
        </Modal>
      )}
    </>
  );
}
