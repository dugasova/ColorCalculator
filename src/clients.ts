import { z } from "zod";
import { collection, doc, getDocs, orderBy, query, serverTimestamp, setDoc, where } from "firebase/firestore";
import { db } from "./firebase";
import type { HairCanvas } from "./engine/canvas";
import { normalizeClientKey } from "./revisit";

const CLIENTS_COLLECTION = "clients";

// Mirrors the shallow-validation trade-off in history/schema.ts's canvasShapeSchema:
// this is the one nested value a corrupt document could feed back into UI state (the
// "last visit" hint / a future auto-filled calculator), so it's the one worth checking.
const canvasShapeSchema = z.object({
  porosity: z.enum(["low", "normal", "high"]),
  thickness: z.enum(["fine", "medium", "coarse"]),
  chemicalHistory: z.array(z.enum(["keratin", "perm", "henna", "direct_dye"])),
});

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

// Deterministic id (owner + normalized name) so saving the same client again upserts one
// profile instead of accumulating duplicates -- the same trick palette.ts's
// disableOverrideId uses for shade-disable overrides. `nameKey` alone isn't unique across
// stylists (two stylists can each have a client named "Anna"); a client profile is owned
// by the stylist who saved it, same boundary as formulaHistory's `appliedBy` (see
// firestore.rules) -- encoding the owner into the id keeps every stylist's book distinct
// without a query round-trip on every save. `encodeURIComponent` avoids "/", which
// Firestore document ids can't contain and an email or client name could otherwise carry.
function clientId(ownedBy: string, nameKey: string): string {
  return `${encodeURIComponent(ownedBy)}::${encodeURIComponent(nameKey)}`;
}

export interface UpsertClientParams {
  ownedBy: string;
  name: string;
  phone: string;
  allergyNotes: string;
  canvas: HairCanvas | null;
}

// Called after every successful formula save (see SessionDetailsPanel's handleSave) so
// the *next* visit's client-name autocomplete can carry the phone number, allergy notes,
// and last known hair canvas forward instead of the colorist re-entering them from
// scratch. A blank name is a no-op -- SessionDetailsPanel already requires a name before
// it will save the formula itself, so this only guards a hypothetical direct caller.
export async function upsertClient(params: UpsertClientParams): Promise<void> {
  const nameKey = normalizeClientKey(params.name);
  if (nameKey === "") return;
  await setDoc(doc(db, CLIENTS_COLLECTION, clientId(params.ownedBy, nameKey)), {
    ownedBy: params.ownedBy,
    name: params.name.trim(),
    nameKey,
    phone: params.phone.trim(),
    allergyNotes: params.allergyNotes,
    lastCanvas: params.canvas,
    updatedAt: serverTimestamp(),
  });
}

// Every stylist's client book is private to them, mirroring formulaHistory's
// `appliedBy`-scoped rule in firestore.rules -- feeds SessionDetailsPanel's client-name
// autocomplete and its phone/allergy-notes/last-canvas autofill.
export async function fetchClients(ownedBy: string): Promise<ClientProfile[]> {
  const snapshot = await getDocs(
    query(collection(db, CLIENTS_COLLECTION), where("ownedBy", "==", ownedBy), orderBy("name"))
  );
  const clients: ClientProfile[] = [];
  for (const doc of snapshot.docs) {
    const result = clientProfileShapeSchema.safeParse({ id: doc.id, ...doc.data() });
    if (!result.success) {
      console.error(`Skipping malformed client document "${doc.id}":`, result.error.issues);
      continue;
    }
    clients.push(result.data);
  }
  return clients;
}
