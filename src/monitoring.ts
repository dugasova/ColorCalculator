import * as Sentry from "@sentry/react";
import { Capacitor } from "@capacitor/core";

// Set per deployment via `.env`'s VITE_SENTRY_DSN (see .env.example). Unset, or a dev
// build, means monitoring stays off entirely.
const SENTRY_DSN: string | undefined = import.meta.env.VITE_SENTRY_DSN;

export function initMonitoring(): void {
  if (!import.meta.env.PROD || !SENTRY_DSN) return;
  Sentry.init({
    dsn: SENTRY_DSN,
    release: __SENTRY_RELEASE__,
    // `sendDefaultPii` was replaced by the more granular `dataCollection` in this SDK
    // major (11.x) -- `userInfo: false` is its closest equivalent: don't auto-populate
    // `user.*` from IP/instrumentation. The only user data this app ever sends is the
    // uid set explicitly via setMonitoringUser below.
    dataCollection: { userInfo: false },
    // Every sync/write failure in this app already reaches a developer only via
    // `console.error` (settleWrite, parseSnapshotDocs, client/favorite saves,
    // ErrorBoundary.componentDidCatch) -- capturing at "error" level surfaces all of
    // those as Sentry issues too, not just uncaught exceptions.
    integrations: [Sentry.captureConsoleIntegration({ levels: ["error"] })],
    initialScope: { tags: { platform: Capacitor.getPlatform() } },
  });
}

export function setMonitoringUser(uid: string | null): void {
  Sentry.setUser(uid === null ? null : { id: uid });
}

export const reactErrorHandler = Sentry.reactErrorHandler;
