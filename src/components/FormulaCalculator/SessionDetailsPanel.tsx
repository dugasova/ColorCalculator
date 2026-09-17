import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ProcessingTimer } from "./ProcessingTimer";
import { BowlCard } from "./BowlCard";
import { createClient, updateClient } from "../../clients";
import type { RepeatFormulaRequest } from "../../history";
import type { HairCanvas } from "../../engine/canvas";
import { usePhotoUpload } from "./usePhotoUpload";
import { useClientLink } from "./useClientLink";
import { ClientDetailsModal } from "./ClientDetailsModal";

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

export type SaveState = "idle" | "saving" | "saved" | "error";

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
  const clientLink = useClientLink(appliedBy, repeatRequest);
  const { clientName, selectedClientId, phone, allergyNotes } = clientLink;
  const [note, setNote] = useState("");
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [patchTestDate, setPatchTestDate] = useState("");
  const [patchTestOverride, setPatchTestOverride] = useState(false);
  const beforePhoto = usePhotoUpload();
  const afterPhoto = usePhotoUpload();
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
        beforePhotoFile: beforePhoto.file,
        afterPhotoFile: afterPhoto.file,
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
        <ClientDetailsModal
          onClose={() => setIsDetailsModalOpen(false)}
          clientLink={clientLink}
          note={note}
          onNoteChange={setNote}
          patchTestDate={patchTestDate}
          onPatchTestDateChange={setPatchTestDate}
          patchTestOverride={patchTestOverride}
          onPatchTestOverrideChange={setPatchTestOverride}
          patchTestOk={patchTestOk}
          beforePhoto={beforePhoto}
          afterPhoto={afterPhoto}
          saveState={saveState}
          onSave={handleSave}
          saveDisabled={saveDisabled === true}
        />
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
