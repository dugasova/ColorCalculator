import { z } from "zod";
import type { BrandId } from "../engine/brands";
import type { DeveloperVolume } from "../engine/levels";
import { developerVolumeSchema } from "../engine/shades";

// Remaining grams of one physical product: either a specific shade within a brand's line
// (identity is (brandId, line, code), same as `shadeKey` -- a bare code isn't unique
// within a brand) or a developer at a given volume, additionally scoped by line for the
// handful of chemically-distinct-developer lines in products.ts's
// SEPARATE_DEVELOPER_LINES -- every other line's developer still shares one bucket per
// (brandId, volume), with `line: null`.
export type StockRecord =
  | { id: string; kind: "shade"; brandId: BrandId; line: string | null; code: string; remainingGrams: number }
  | { id: string; kind: "developer"; brandId: BrandId; line: string | null; volume: DeveloperVolume; remainingGrams: number };

// Validates a dyeStock Firestore document's payload -- everything but `id`, which comes
// from the document id itself (see firestore.ts's subscribeToStock), same pattern as
// paletteOverrideSchema in engine/paletteOverrides.ts.
// The developer variant's `line` is `.default(null)`, not plain `.nullable()`, because
// every developer stock document written before this line-scoping feature existed (see
// products.ts's SEPARATE_DEVELOPER_LINES) has no `line` key at all, not even `null` --
// without the default, every one of those pre-existing documents fails validation and gets
// silently dropped by parseSnapshotDocs, making an admin's already-tracked developer
// stock vanish from the app the moment this feature ships.
export const stockRecordSchema: z.ZodType<Omit<StockRecord, "id">> = z.union([
  z.object({ kind: z.literal("shade"), brandId: z.string(), line: z.string().nullable(), code: z.string(), remainingGrams: z.number() }),
  z.object({ kind: z.literal("developer"), brandId: z.string(), line: z.string().nullable().default(null), volume: developerVolumeSchema, remainingGrams: z.number() }),
]);

export type StockStatus = "out" | "low" | "ok";

interface ReorderItemBase { id: string; brandId: BrandId; remainingGrams: number; status: "low" | "out"; packGrams: number; suggestedPacks: number }
export type ReorderItem =
  | (ReorderItemBase & { kind: "shade"; line: string | null; code: string; unit: "tube" })
  | (ReorderItemBase & { kind: "developer"; line: string | null; volume: DeveloperVolume; unit: "bottle" });

// One product's grams consumed by a saved session, already summed across every step that
// touched it -- see consumption.ts's computeStockConsumption. `code` is display-only (a
// shade code, or the developer volume rendered as a string), never used to re-derive `id`.
export interface StockConsumption {
  id: string;
  kind: "shade" | "developer";
  code: string;
  grams: number;
}

// A dye/developer a session would need more of than the salon has on hand -- surfaced as
// an inline warning (see FormulaResults, ComplexColoringCalculator) rather than blocking
// the save, since the stylist may already know to substitute or restock before mixing.
export interface StockShortage {
  consumption: StockConsumption;
  remainingGrams: number;
}
