import { doc, onSnapshot, setDoc, type Unsubscribe } from "firebase/firestore";
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
}

export const DEFAULT_PRICING_SETTINGS: PricingSettings = { markupMultiplier: DEFAULT_MARKUP_MULTIPLIER };

export const pricingSettingsSchema: z.ZodType<PricingSettings> = z.object({
  markupMultiplier: z.number().positive(),
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
    }
  );
}

export async function setSalonMarkupMultiplier(markupMultiplier: number): Promise<void> {
  await setDoc(doc(db, SALON_SETTINGS_COLLECTION, PRICING_SETTINGS_DOC_ID), { markupMultiplier });
}
