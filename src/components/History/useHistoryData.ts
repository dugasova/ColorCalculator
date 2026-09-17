import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from "react";
import { useTranslation } from "react-i18next";
import { fetchFormulaHistory, type FormulaHistoryEntry } from "../../history";
import { getClientGroupKey, normalizeClientKey } from "../../revisit";
import { fetchClients, type ClientProfile } from "../../clients";

// One client's full visit timeline, grouped from the flat (already date-sorted-desc)
// `entries` fetch -- lets the list read as "N visits for Anna K." instead of Anna's
// visits interleaved with everyone else's. `profile` is the saved-client record (see
// clients.ts) for the signed-in stylist's own book -- an admin browsing another
// stylist's clients simply won't have a match (that profile is private to its owner,
// same boundary firestore.rules enforces), so `profile` stays null there.
export interface ClientHistoryGroup {
  key: string;
  displayName: string;
  entries: FormulaHistoryEntry[];
  profile: ClientProfile | null;
}

export interface HistoryData {
  entries: FormulaHistoryEntry[];
  setEntries: Dispatch<SetStateAction<FormulaHistoryEntry[]>>;
  isLoading: boolean;
  error: string | null;
  savedClients: ClientProfile[];
  filtered: FormulaHistoryEntry[];
  groups: ClientHistoryGroup[];
  // Keyed exactly the way `getClientGroupKey` keys a `ClientRevisitPlan` (a real
  // `clientId`, or a `name:`-prefixed normalized-name fallback), so a revisit plan's
  // `clientKey` resolves directly without re-deriving the join `groups` above already
  // does per entry.
  profilesByClientKey: Map<string, ClientProfile>;
}

// Loads a stylist's (or, for an admin, everyone's) saved formula history plus their own
// client book, and derives the search-filtered, per-client-grouped view HistoryView
// renders. `search` is plain client-side filtering over the already-loaded `entries` --
// cheap enough not to warrant its own fetch, and keeps typing responsive.
export function useHistoryData({
  isAdmin, currentUserEmail, search,
}: {
  isAdmin: boolean;
  currentUserEmail: string;
  search: string;
}): HistoryData {
  const { t } = useTranslation();
  const [entries, setEntries] = useState<FormulaHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savedClients, setSavedClients] = useState<ClientProfile[]>([]);

  useEffect(() => {
    fetchFormulaHistory({ isAdmin, currentUserEmail })
      .then(setEntries)
      .catch(() => setError(t("history.loadError")))
      .finally(() => setIsLoading(false));
  }, [t, isAdmin, currentUserEmail]);

  useEffect(() => {
    fetchClients(currentUserEmail)
      .then(setSavedClients)
      .catch(err => console.error("Failed to load saved clients:", err));
  }, [currentUserEmail]);

  const profilesByClientKey = useMemo(() => {
    const map = new Map<string, ClientProfile>();
    for (const client of savedClients) {
      map.set(client.id, client);
      // Mirrors the existing name-based fallback semantics: `savedClients` is
      // name-ordered, so the first same-named profile wins.
      const nameKey = `name:${normalizeClientKey(client.name)}`;
      if (!map.has(nameKey)) map.set(nameKey, client);
    }
    return map;
  }, [savedClients]);

  const filtered = entries.filter(entry =>
    entry.clientName.toLowerCase().includes(search.trim().toLowerCase())
  );

  const groups = useMemo<ClientHistoryGroup[]>(() => {
    const map = new Map<string, ClientHistoryGroup>();
    for (const entry of filtered) {
      const key = getClientGroupKey(entry);
      const existing = map.get(key);
      if (existing !== undefined) {
        existing.entries.push(entry);
        continue;
      }
      // Prefer matching the saved-client profile by the entry's own real clientId --
      // falls back to a normalized-name match only for entries saved before clientId
      // existed, which carries the same "could be the wrong same-named person" risk the
      // rest of this feature exists to avoid, but there's no better signal to use for them.
      const profile = entry.clientId !== null
        ? savedClients.find(c => c.id === entry.clientId) ?? null
        : savedClients.find(c => normalizeClientKey(c.name) === normalizeClientKey(entry.clientName)) ?? null;
      map.set(key, { key, displayName: entry.clientName, entries: [entry], profile });
    }
    return Array.from(map.values());
  }, [filtered, savedClients]);

  return { entries, setEntries, isLoading, error, savedClients, filtered, groups, profilesByClientKey };
}
