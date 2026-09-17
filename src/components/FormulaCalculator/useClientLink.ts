import { useEffect, useMemo, useState } from "react";
import { fetchClients, type ClientProfile } from "../../clients";
import type { RepeatFormulaRequest } from "../../history";
import { formatCanvasText } from "../../formatSession";

const MAX_CLIENT_SUGGESTIONS = 6;

export interface ClientLink {
  clientName: string;
  handleClientNameChange: (value: string) => void;
  // The colorist's explicit pick among possibly-several same-named saved clients (see
  // `suggestions` below) -- `null` means "no specific existing client confirmed yet",
  // which on save creates a brand-new profile. Two real people can share a name, so this
  // (not `clientName`) is what actually identifies whose history a save belongs to.
  selectedClientId: string | null;
  selectedClient: ClientProfile | null;
  // Candidates for the typed name, offered as explicit picks rather than auto-matched --
  // two real clients can share a display name, so which one this visit belongs to has to
  // be a deliberate choice, not a guess from text alone. Empty once a specific client is
  // already confirmed (selectedClientId set); repopulates the moment the colorist edits
  // the name again, since that invalidates whatever was previously confirmed.
  suggestions: ClientProfile[];
  // Carries the picked client's phone/allergy notes forward so the colorist doesn't retype
  // them every visit -- only into fields still blank, so it never clobbers something
  // already typed this visit (e.g. a fresh allergy note for today).
  handleSelectSuggestion: (client: ClientProfile) => void;
  // Escape hatch for the rare exact-name collision the colorist notices only after
  // picking -- detaches from that profile without having to retype the name, so the next
  // save creates a fresh one instead of overwriting the wrong person's record.
  handleClearSelection: () => void;
  phone: string;
  setPhone: (value: string) => void;
  allergyNotes: string;
  setAllergyNotes: (value: string) => void;
  // Purely informational -- the canvas fields live at the top of the calculator, entered
  // well before a client is even picked here, so there's no live value to overwrite. This
  // just lets the colorist sanity-check what they set against what was recorded last time.
  lastVisitCanvasText: string | null;
}

// Matches the typed client name against the stylist's own saved-client book, and carries
// that link's phone/allergy notes forward -- shared by SessionDetailsPanel's manual name
// entry and its "Repeat formula" replay (see `repeatRequest`, buildRepeatFormulaRequest in
// History). `appliedBy` scopes the saved-client lookup to the signed-in stylist's own
// book, same ownership boundary as formulaHistory's `appliedBy`.
export function useClientLink(appliedBy: string, repeatRequest?: RepeatFormulaRequest | null): ClientLink {
  const [clientName, setClientName] = useState("");
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [phone, setPhone] = useState("");
  const [allergyNotes, setAllergyNotes] = useState("");
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

  // Loads once per mount, not gated on any modal being open -- so the suggestion list
  // below is ready the instant the colorist needs it, with no extra loading flicker.
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
  // Without this, repeating a returning client's past visit left the client fields blank,
  // so an easy-to-miss unlinked save on top of it created a second, duplicate client
  // profile for the exact same person -- double-counting them in every "unique clients"
  // figure (History's grouping, AnalyticsView's retention/uniqueClients).
  if (repeatRequest && repeatRequest !== appliedRepeatRequest) {
    setAppliedRepeatRequest(repeatRequest);
    setClientName(repeatRequest.clientName);
    setSelectedClientId(repeatRequest.clientId);
  }

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

  const lastVisitCanvasText = selectedClient?.lastCanvas ? formatCanvasText(selectedClient.lastCanvas) : null;

  const handleClientNameChange = (value: string) => {
    setClientName(value);
    // Any manual edit invalidates whatever specific client was previously confirmed --
    // re-picking (or typing a genuinely new name) is required again.
    setSelectedClientId(null);
  };

  const handleSelectSuggestion = (client: ClientProfile) => {
    setClientName(client.name);
    setSelectedClientId(client.id);
    setPhone(prev => (prev === "" ? client.phone : prev));
    setAllergyNotes(prev => (prev === "" ? client.allergyNotes : prev));
  };

  const handleClearSelection = () => setSelectedClientId(null);

  return {
    clientName,
    handleClientNameChange,
    selectedClientId,
    selectedClient,
    suggestions,
    handleSelectSuggestion,
    handleClearSelection,
    phone,
    setPhone,
    allergyNotes,
    setAllergyNotes,
    lastVisitCanvasText,
  };
}
