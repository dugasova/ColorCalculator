import type { QuerySnapshot } from "firebase/firestore";
import type { ZodType } from "zod";

// Shared defensive-parse loop for every `subscribeToX` live query in this project (see
// clients.ts, stock.ts, palette.ts, history/firestore.ts) -- a hand-edited Firestore
// console change, or a future schema change read by an old client, must never crash deep
// inside the formula engine, far from this read, with no clue which document caused it.
// Skips and logs a malformed document instead of propagating a throw or producing garbage.
//
// `includeId` picks which of the two shapes this project's schemas come in:
// - `false` (default): the schema has no `id` field of its own -- validates the
//   document's raw data, then appends `{ id: doc.id, ...parsed }` onto whatever
//   validated. Used by stock.ts/palette.ts's schemas.
// - `true`: the schema declares its own `id: z.string()` field and genuinely validates
//   it -- `doc.id` is merged into the input *before* parsing, and the parsed result
//   already carries `id`. Used by clients.ts/history/firestore.ts's schemas.
//
// `T` (the real return element type, e.g. `StockRecord`) is supplied explicitly by every
// caller rather than inferred from `schema` -- an `includeId: false` schema only validates
// `Omit<T, "id">`, so `T` and the schema's own parsed type genuinely differ. This is the
// same manual `as T` cast every caller made by hand before this loop was extracted.
export function parseSnapshotDocs<T>(snapshot: QuerySnapshot, schema: ZodType<unknown>, label: string, includeId = false): T[] {
  const items: T[] = [];
  for (const d of snapshot.docs) {
    const input = includeId ? { id: d.id, ...d.data() } : d.data();
    const result = schema.safeParse(input);
    if (!result.success) {
      console.error(`Skipping malformed ${label} document "${d.id}":`, result.error.issues);
      continue;
    }
    items.push((includeId ? result.data : { id: d.id, ...(result.data as object) }) as T);
  }
  return items;
}
