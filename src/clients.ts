import { z } from "zod";
import { addDoc, collection, deleteDoc, doc, onSnapshot, orderBy, query, serverTimestamp, updateDoc, where } from "firebase/firestore";
import type { FirestoreError, Unsubscribe } from "firebase/firestore";
import { db } from "./firebase";
import { parseSnapshotDocs } from "./firestoreSubscribe";
import { canvasShapeSchema, type HairCanvas } from "./engine/canvas";

const CLIENTS_COLLECTION = "clients";

// See engine/canvas.ts's canvasShapeSchema for why this is shallow-validated: it's the
// one nested value a corrupt document could feed back into UI state (the "last visit"
// hint / a future auto-filled calculator), so it's the one worth checking.
const clientProfileShapeSchema = z.object({
  id: z.string(),
  ownedBy: z.string(),
  name: z.string(),
  phone: z.string(),
  allergyNotes: z.string(),
  lastCanvas: canvasShapeSchema.nullable(),
});

export interface ClientProfile {
  id: string;
  ownedBy: string;
  name: string;
  phone: string;
  allergyNotes: string;
  lastCanvas: HairCanvas | null;
}

export interface CreateClientParams {
  ownedBy: string;
  name: string;
  phone: string;
  allergyNotes: string;
  canvas: HairCanvas | null;
}

// A brand-new client profile, identified from here on by its own real Firestore id --
// never by name. Two real people can share the exact same name (see SessionDetailsPanel's
// suggestion picker, which exists precisely so a colorist can tell them apart before
// saving); a name-derived id would silently merge their profiles and history together.
// Returns the new id so the caller can stamp it onto the formula entry being saved
// (FormulaHistoryEntry.clientId), which is what actually lets "this client's history"/
// "repeat formula" target the right person later.
export async function createClient(params: CreateClientParams): Promise<string> {
  const docRef = await addDoc(collection(db, CLIENTS_COLLECTION), {
    ownedBy: params.ownedBy,
    name: params.name.trim(),
    phone: params.phone.trim(),
    allergyNotes: params.allergyNotes,
    lastCanvas: params.canvas,
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

export interface UpdateClientParams {
  name: string;
  phone: string;
  allergyNotes: string;
  canvas: HairCanvas | null;
}

// Refreshes an *already-identified* client's profile (the colorist picked a specific
// suggestion in SessionDetailsPanel, so `id` is that exact person's real id, not a
// name-based guess) with whatever changed this visit -- phone, allergy notes, and the
// current hair canvas.
export async function updateClient(id: string, params: UpdateClientParams): Promise<void> {
  await updateDoc(doc(db, CLIENTS_COLLECTION, id), {
    name: params.name.trim(),
    phone: params.phone.trim(),
    allergyNotes: params.allergyNotes,
    lastCanvas: params.canvas,
    updatedAt: serverTimestamp(),
  });
}

// Every stylist's client book is private to them, mirroring formulaHistory's
// `appliedBy`-scoped rule in firestore.rules -- feeds SessionDetailsPanel's client-name
// suggestion list and its phone/allergy-notes/last-canvas autofill.
// Live query for the same reason subscribeToFormulaHistory is live: a profile created or
// renamed on another device must show up in an open client picker/History list without a
// reload. Malformed documents are skipped and logged, exactly as the one-shot read did.
export function subscribeToClients(
  ownedBy: string,
  onChange: (clients: ClientProfile[]) => void,
  onError: (error: FirestoreError) => void,
): Unsubscribe {
  const q = query(collection(db, CLIENTS_COLLECTION), where("ownedBy", "==", ownedBy), orderBy("name"));
  return onSnapshot(q, snapshot => {
    onChange(parseSnapshotDocs(snapshot, clientProfileShapeSchema, "client", true));
  }, onError);
}

// Permanently erases a client's saved profile -- admin-only (see firestore.rules), called
// alongside history/firestore.ts's deleteHistoryEntry when an admin wipes a client's
// entire record (see HistoryView's "Delete client" confirm flow). Irreversible: no
// soft-delete flag, nothing left behind in `clients` once this resolves.
export async function deleteClient(id: string): Promise<void> {
  await deleteDoc(doc(db, CLIENTS_COLLECTION, id));
}
