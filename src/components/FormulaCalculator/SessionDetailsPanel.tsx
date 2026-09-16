import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ProcessingTimer } from "./ProcessingTimer";
import { BowlCard } from "./BowlCard";
import { Modal } from "../common/Modal";
import { createClient, fetchClients, updateClient, type ClientProfile } from "../../clients";
import type { RepeatFormulaRequest } from "../../history";
import { formatCanvasText } from "../../formatSession";
import type { HairCanvas } from "../../engine/canvas";

export interface SessionDetails {
  clientName: string;
  // The specific saved client (clients.ts) this visit belongs to, or `null` for a
  // brand-new profile the caller should create -- see SessionDetailsPanelProps' own
  // comment on why a name string alone can't safely identify who this is.
  clientId: string | null;
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
  // The signed-in stylist's own email -- scopes the saved-client lookup/create/update (see
  // clients.ts) to their own book, same ownership boundary as formulaHistory's `appliedBy`.
  appliedBy: string;
  // The session's current hair canvas (porosity/thickness/chemical history), carried
  // forward onto the client's profile as their "last known" canvas on save. Not itself
  // editable here -- it's entered at the top of the calculator, well before this panel's
  // client-name field exists to match against.
  canvas?: HairCanvas;
  // Pre-fills and re-links the client name to the same profile when replaying a "Repeat
  // formula" request from History (see FormulaCalculator's repeatRequest and
  // buildRepeatFormulaRequest) -- without this, a repeated visit for a returning client
  // silently created a second, duplicate client profile unless the colorist happened to
  // re-pick the exact suggestion by hand, which double-counted that person in every
  // "unique clients" figure (History's grouping, AnalyticsView's retention). Omitted (not
  // just `null`) for a caller with no repeat concept at all, e.g. ComplexColoringCalculator.
  repeatRequest?: RepeatFormulaRequest | null;
}

const COPIED_FEEDBACK_MS = 1500;
const SAVED_FEEDBACK_MS = 1500;
const PATCH_TEST_MIN_HOURS = 48;
const MAX_CLIENT_SUGGESTIONS = 6;

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
export function SessionDetailsPanel({
  formulaText, processingMinutes, onSave, saveDisabled, onSaved, appliedBy, canvas, repeatRequest,
}: SessionDetailsPanelProps) {
  const { t } = useTranslation();
  const [isCopied, setIsCopied] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  // The large print/at-a-glance card (composition + processing time + client name) for
  // reading next to the mixing bowl -- opened from a tap on the confirmed client name
  // below, so a colorist never has to re-open the whole Client details modal for it.
  const [isBowlCardOpen, setIsBowlCardOpen] = useState(false);
  const [clientName, setClientName] = useState("");
  // The colorist's explicit pick among possibly-several same-named saved clients (see the
  // suggestion list below) -- `null` means "no specific existing client confirmed yet",
  // which on save creates a brand-new profile. Two real people can share a name, so this
  // (not `clientName`) is what actually identifies whose history a save belongs to.
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
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
  // The repeatRequest currently applied to clientName/selectedClientId below -- a fresh
  // object each time History's "Repeat" button is clicked (see buildRepeatFormulaRequest),
  // so comparing by reference is enough to apply each click exactly once, the same
  // pattern useFormulaCalculatorState uses for the rest of the repeated formula's fields.
  const [appliedRepeatRequest, setAppliedRepeatRequest] = useState<RepeatFormulaRequest | null>(null);
  // The clientId whose phone/allergy notes have already been backfilled below -- distinct
  // from `appliedRepeatRequest` because the matched ClientProfile may resolve out of the
  // async fetchClients load well after the repeat replay (or an explicit suggestion pick)
  // sets `selectedClientId`, on a later render.
  const [contactBackfilledForClientId, setContactBackfilledForClientId] = useState<string | null>(null);
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

  // Loads once per mount, not gated on the details modal being open -- so the suggestion
  // list below is ready the instant the colorist opens it, with no extra loading flicker.
  // Cheap: one stylist's own client book, not the whole salon's.
  useEffect(() => {
    let cancelled = false;
    fetchClients(appliedBy)
      .then(list => { if (!cancelled) setSavedClients(list); })
      .catch(err => console.error("Failed to load saved clients:", err));
    return () => { cancelled = true; };
  }, [appliedBy]);

  // Replay a "Repeat formula" request's client link right during render, same pattern
  // (and same rationale) as useFormulaCalculatorState's own repeatRequest effect: no
  // extra render tick needed, see https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes.
  // Without this, repeating a returning client's past visit left this panel's client
  // fields blank, so an easy-to-miss unlinked save on top of it created a second,
  // duplicate client profile for the exact same person -- double-counting them in every
  // "unique clients" figure (History's grouping, AnalyticsView's retention/uniqueClients).
  if (repeatRequest && repeatRequest !== appliedRepeatRequest) {
    setAppliedRepeatRequest(repeatRequest);
    setClientName(repeatRequest.clientName);
    setSelectedClientId(repeatRequest.clientId);
  }


  // Candidates for the typed name, offered as explicit picks rather than auto-matched --
  // two real clients can share a display name, so which one this visit belongs to has to
  // be a deliberate choice, not a guess from text alone. Hidden once a specific client is
  // already confirmed (selectedClientId set); reappears the moment the colorist edits the
  // name again, since that invalidates whatever was previously confirmed.
  const suggestions = useMemo(() => {
    if (selectedClientId !== null) return [];
    const query = clientName.trim().toLowerCase();
    if (query === "") return [];
    return savedClients.filter(c => c.name.toLowerCase().includes(query)).slice(0, MAX_CLIENT_SUGGESTIONS);
  }, [clientName, selectedClientId, savedClients]);

  const selectedClient = useMemo(
    () => (selectedClientId !== null ? savedClients.find(c => c.id === selectedClientId) ?? null : null),
    [selectedClientId, savedClients]
  );

  // Backfills phone/allergy notes once the repeat-linked profile resolves out of the
  // async fetchClients load above -- handleSelectSuggestion does this eagerly for an
  // explicit click, but a repeat-driven selection has no click to hang it off of, and
  // `savedClients` may still be loading the instant the replay above runs. Right during
  // render, same "adjust state when a prop/derived value changes" pattern as the
  // repeatRequest replay above -- only into fields still blank (never overwrites
  // something already typed this visit), and a no-op once already backfilled for this
  // clientId (or handleSelectSuggestion already filled them in itself).
  if (selectedClient !== null && selectedClient.id !== contactBackfilledForClientId) {
    setContactBackfilledForClientId(selectedClient.id);
    setPhone(prev => (prev === "" ? selectedClient.phone : prev));
    setAllergyNotes(prev => (prev === "" ? selectedClient.allergyNotes : prev));
  }

  // Purely informational -- the canvas fields live at the top of the calculator, entered
  // well before a client is even picked here, so there's no live value to overwrite. This
  // just lets the colorist sanity-check what they set against what was recorded last time.
  const lastVisitCanvasText = selectedClient?.lastCanvas ? formatCanvasText(selectedClient.lastCanvas) : null;

  const handleClientNameChange = (value: string) => {
    setClientName(value);
    // Any manual edit invalidates whatever specific client was previously confirmed --
    // re-picking (or typing a genuinely new name) is required again.
    setSelectedClientId(null);
  };

  // Carries the picked client's phone/allergy notes forward so the colorist doesn't retype
  // them every visit -- only into fields still blank, so it never clobbers something
  // already typed this visit (e.g. a fresh allergy note for today).
  const handleSelectSuggestion = (client: ClientProfile) => {
    setClientName(client.name);
    setSelectedClientId(client.id);
    setPhone(prev => (prev === "" ? client.phone : prev));
    setAllergyNotes(prev => (prev === "" ? client.allergyNotes : prev));
  };

  // Escape hatch for the rare exact-name collision the colorist notices only after
  // picking -- detaches from that profile without having to retype the name, so the next
  // save creates a fresh one instead of overwriting the wrong person's record.
  const handleClearSelection = () => setSelectedClientId(null);

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
      // Resolves the *real* client id before saving the formula, so the entry can carry
      // it (FormulaHistoryEntry.clientId) instead of just a name string. Best-effort like
      // the photo-upload attach below: a hiccup here shouldn't block saving the formula
      // itself, it just means this one visit won't be linked to a profile yet.
      let clientId = selectedClientId;
      try {
        if (clientId === null) {
          clientId = await createClient({
            ownedBy: appliedBy,
            name: clientName.trim(),
            phone: phone.trim(),
            allergyNotes,
            canvas: canvas ?? null,
          });
        } else {
          await updateClient(clientId, {
            name: clientName.trim(),
            phone: phone.trim(),
            allergyNotes,
            canvas: canvas ?? null,
          });
        }
      } catch (err) {
        console.error("Could not save the client profile -- the formula will still be saved, just without a linked client id this time.", err);
        clientId = selectedClientId;
      }

      await onSave({
        clientName: clientName.trim(),
        clientId,
        note: note.trim(),
        phone: phone.trim(),
        patchTestDate,
        allergyNotes,
        patchTestOverride,
        beforePhotoFile,
        afterPhotoFile,
      });
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
        {clientName.trim() !== "" && (
          <button
            type="button"
            className="results__client-summary-name"
            onClick={() => setIsBowlCardOpen(true)}
            aria-label={t("results.bowlCardOpenAria", { name: clientName.trim() })}
          >
            {clientName.trim()}
          </button>
        )}
        {clientName.trim() !== "" && !patchTestOk && <p className="warning" role="alert">{t("results.patchTestRequired")}</p>}
      </div>

      {isDetailsModalOpen && (
        <Modal title={t("results.clientDetailsSectionTitle")} onClose={() => setIsDetailsModalOpen(false)}>
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

      {isBowlCardOpen && (
        <BowlCard
          clientName={clientName.trim()}
          formulaText={formulaText}
          processingMinutes={processingMinutes}
          onClose={() => setIsBowlCardOpen(false)}
        />
      )}
    </>
  );
}
