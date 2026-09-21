export const PATCH_TEST_MIN_HOURS = 48;

// Whether a recorded patch test satisfies the pre-service requirement: either the colorist
// confirmed one isn't needed, or a test was logged at least PATCH_TEST_MIN_HOURS before
// `referenceMs` -- "now" when saving a new visit, the visit's own `appliedAt` when
// correcting a saved one (a test can't be back-dated to look compliant against today).
// `patchTestDate` is the raw `datetime-local` string; "" means none recorded.
export function isPatchTestSufficient(patchTestDate: string, patchTestOverride: boolean, referenceMs: number): boolean {
  if (patchTestOverride) return true;
  if (patchTestDate === "") return false;
  return referenceMs - new Date(patchTestDate).getTime() >= PATCH_TEST_MIN_HOURS * 60 * 60 * 1000;
}
