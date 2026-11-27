import { deleteField, doc, onSnapshot, setDoc, type Unsubscribe } from "firebase/firestore";
import { settleWrite } from "./firestoreWrite";
import { z } from "zod";
import { db } from "./firebase";
import { DEFAULT_MARKUP_MULTIPLIER } from "./engine/pricing";

const SALON_SETTINGS_COLLECTION = "salonSettings";
// One well-known document id, not an auto id: there is exactly one salon (see the shared
// invite code in src/inviteCode.ts and firestore.rules' "every account is one salon"
// comment), so a fixed id keeps the setting idempotent to write and trivial to read.
const PRICING_SETTINGS_DOC_ID = "pricing";

export interface PricingSettings {
  // Multiplier applied to a session's product cost to recommend a service price. Seeded
  // from DEFAULT_MARKUP_MULTIPLIER until an admin saves one in Palette.
  markupMultiplier: number;
  // The salon's own price per gram for a brand, keyed by brand id, where an admin set one
  // in Palette; a brand missing here keeps its built-in (or add-time) price.
  brandPricesPerGram: Record<string, number>;
}

export const DEFAULT_PRICING_SETTINGS: PricingSettings = {
  markupMultiplier: DEFAULT_MARKUP_MULTIPLIER,
  brandPricesPerGram: {},
};

// A document saved before brand prices existed has no `brandPricesPerGram`.
export const pricingSettingsSchema = z.object({
  markupMultiplier: z.number().positive(),
  brandPricesPerGram: z.record(z.string(), z.number().positive()).default({}),
});

// A missing document (no admin has ever saved one), a malformed one, and a listener-level
// failure (e.g. the Firestore rule for this collection hasn't propagated/deployed yet --
// see firestore.rules) all fall back to the built-in default instead of breaking every
// calculator's pricing panel or surfacing as an uncaught "Error in snapshot listener" in
// the console. Same skip-and-log posture as subscribeToCustomBrands/subscribeToStock for
// the per-document case, plus an explicit onError handler for the listener-level one.
export function subscribeToPricingSettings(onChange: (settings: PricingSettings) => void): Unsubscribe {
  return onSnapshot(
    doc(db, SALON_SETTINGS_COLLECTION, PRICING_SETTINGS_DOC_ID),
    snapshot => {
      if (!snapshot.exists()) {
        onChange(DEFAULT_PRICING_SETTINGS);
        return;
      }
      const result = pricingSettingsSchema.safeParse(snapshot.data());
      if (!result.success) {
        console.error("Ignoring malformed salon pricing settings document:", result.error.issues);
        onChange(DEFAULT_PRICING_SETTINGS);
        return;
      }
      onChange(result.data);
    },
    err => {
      console.error("Falling back to the default markup -- could not subscribe to salon pricing settings:", err);
      onChange(DEFAULT_PRICING_SETTINGS);
    },
  );
}

export async function setSalonMarkupMultiplier(markupMultiplier: number): Promise<void> {
  await settleWrite(
    // Merged, so the brand prices kept in the same document survive.
    setDoc(doc(db, SALON_SETTINGS_COLLECTION, PRICING_SETTINGS_DOC_ID), { markupMultiplier }, { merge: true }),
    "set salon markup",
  );
}

// Sets one brand's price per gram, or with `null` drops it so the brand falls back to its
// default price. Only that brand's key changes: the merge keeps the markup and the others.
export async function setBrandPricePerGram(brandId: string, pricePerGram: number | null): Promise<void> {
  await settleWrite(
    setDoc(
      doc(db, SALON_SETTINGS_COLLECTION, PRICING_SETTINGS_DOC_ID),
      { brandPricesPerGram: { [brandId]: pricePerGram ?? deleteField() } },
      { merge: true },
    ),
    "set brand price per gram",
  );
}
