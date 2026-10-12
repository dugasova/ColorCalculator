import type { Analytics, logEvent as LogEvent } from "firebase/analytics";
import { app } from "./firebase";

// Product usage (GA4 via Firebase Analytics) -- distinct from src/analytics.ts, which is
// the salon's own revenue/volume statistics screen, not product telemetry.
export type ProductEventName =
  | "login" | "sign_up" | "access_requested" | "access_approved" | "access_rejected"
  | "screen_view" | "formula_saved" | "formula_copied" | "formula_shared"
  | "formula_repeated" | "favorite_applied";

type Loaded = { analytics: Analytics; logEvent: typeof LogEvent };
let loaded: Promise<Loaded | null> = Promise.resolve(null);

// Dev/test builds and any deployment without a configured measurementId (see
// .env.example) never pay for loading the `firebase/analytics` chunk at all -- trackEvent
// below is a safe no-op in both cases, so every call site can fire unconditionally.
export function initProductAnalytics(): void {
  if (!import.meta.env.PROD || !app.options.measurementId) return;
  loaded = import("firebase/analytics")
    .then(async m => (await m.isSupported())
      ? {
        analytics: m.initializeAnalytics(app, {
          config: { allow_google_signals: false, allow_ad_personalization_signals: false },
        }),
        logEvent: m.logEvent,
      }
      : null)
    .catch(err => {
      console.error("Product analytics unavailable:", err);
      return null;
    });
}

// Never pass email, client names, or formula text in `params` -- see the pilot's
// assumptions on GA4 PII (no consent banner; participants are personally invited).
export function trackEvent(name: ProductEventName, params?: Record<string, string | number>): void {
  void loaded.then(l => {
    if (l === null) return;
    // `logEvent`'s overloads are keyed on specific GA4 event-name string literals
    // (`login`, `sign_up`, `screen_view`, ...); a `ProductEventName` union -- which also
    // includes this app's own custom event names -- doesn't line up with any single
    // overload, so this narrows back to the generic custom-event signature by hand.
    (l.logEvent as (analytics: Analytics, eventName: string, eventParams?: Record<string, string | number>) => void)(
      l.analytics, name, params
    );
  });
}
