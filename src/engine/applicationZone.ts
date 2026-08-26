export type ApplicationZone = 'full-head' | 'root-touch-up';

// Root touch-up (new-growth only) uses noticeably less product than a full-head
// application. These are just sensible starting points for the weight field —
// still fully editable afterward, same as every other default in this calculator.
export const APPLICATION_ZONE_DEFAULT_GRAMS: Record<ApplicationZone, number> = {
  'full-head': 80,
  'root-touch-up': 40,
};
