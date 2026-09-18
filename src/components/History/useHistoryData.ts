import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from "react";
import { useTranslation } from "react-i18next";
import { subscribeToFormulaHistory, deleteHistoryEntry, type FormulaHistoryEntry } from "../../history";
import { getClientGroupKey, normalizeClientKey } from "../../revisit";
import { subscribeToClients, deleteClient, type ClientProfile } from "../../clients";

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
  // Permanently deletes a client's saved profile and every visit in `group.entries` --
  // see HistoryView's admin-only "Delete client" confirm flow. Resolves `true` on
  // success (local `entries`/`savedClients` already updated to match) or `false` once
  // `deleteError` is set, so the caller can decide whether to close its confirm dialog.
  deleteClientGroup: (group: ClientHistoryGroup) => Promise<boolean>;
  // The group currently being deleted (for a per-button pending/disabled state), or
  // null once the delete settles either way.
  deletingClientKey: string | null;
  deleteError: string | null;
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
  const [deletingClientKey, setDeletingClientKey] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    return subscribeToFormulaHistory({ isAdmin, currentUserEmail }, entries => {
      setEntries(entries);
      setError(null);
      setIsLoading(false);
    }, err => {
      console.error("Formula history subscription failed:", err);
      setError(t("history.loadError"));
      setIsLoading(false);
    });
  }, [t, isAdmin, currentUserEmail]);

  useEffect(() => {
    return subscribeToClients(currentUserEmail, setSavedClients, err => console.error("Saved clients subscription failed:", err));
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

  // Cascades: every visit in the group first (photos + doc, see deleteHistoryEntry),
  // then the saved profile itself (if the group has a real one -- a legacy name-only
  // group with no matching `clients` document simply has nothing further to delete).
  // Order matters for the same reason saveFormulaToHistory writes parent-before-child:
  // here it's the reverse, child-before-parent, so a crash partway through never leaves
  // a `clients` doc pointing at visits that no longer exist -- worst case on failure is
  // extra orphaned visits still findable/re-deletable, never a dangling client reference.
  async function deleteClientGroup(group: ClientHistoryGroup): Promise<boolean> {
    setDeletingClientKey(group.key);
    setDeleteError(null);
    try {
      await Promise.all(group.entries.map(entry => deleteHistoryEntry(entry)));
      if (group.profile !== null) {
        await deleteClient(group.profile.id);
      }
      const deletedIds = new Set(group.entries.map(entry => entry.id));
      setEntries(prev => prev.filter(entry => !deletedIds.has(entry.id)));
      if (group.profile !== null) {
        const deletedProfileId = group.profile.id;
        setSavedClients(prev => prev.filter(client => client.id !== deletedProfileId));
      }
      return true;
    } catch (err) {
      console.error(`Failed to delete client "${group.displayName}":`, err);
      setDeleteError(t("history.deleteClientError"));
      return false;
    } finally {
      setDeletingClientKey(null);
    }
  }

  return {
    entries, setEntries, isLoading, error, savedClients, filtered, groups, profilesByClientKey,
    deleteClientGroup, deletingClientKey, deleteError,
  };
}
