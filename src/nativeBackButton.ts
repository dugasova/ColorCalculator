import { useEffect, useRef } from "react";
import { Capacitor } from "@capacitor/core";
import { App } from "@capacitor/app";

// This SPA drives screen switches (calculator/history/analytics/...) with plain React
// state (see AuthenticatedApp's `view`), not a pushed browser-history entry per screen --
// only the "Reference" tab's pages (/loreal, /guides/resistant-gray, ...) are real
// routes. So the WebView's own history stack is almost always empty, and Capacitor's
// *default* Android back-button/edge-swipe behavior ("go back in WebView history, else
// exit") exits the app on the very first back gesture from anywhere. Registering our own
// `backButton` listener (see useNativeBackButton below) replaces that default entirely --
// Capacitor requires this once you listen, per its own docs -- with: close the topmost
// open Modal, else hand off to the caller's in-app "go home" navigation, else actually
// exit.

// Modal.tsx (shared by every dialog in the app: ClientDetailsModal, BowlCard,
// ChangePasswordModal, HistoryView's client/confirm-delete modals, ...) pushes/pops
// itself here for as long as it's mounted, so a single back press closes only the
// topmost dialog -- HistoryView can have a confirm-delete Modal open on top of a client
// Modal, and back should close just the confirm dialog. Plain module state, not React
// context: Modal already portals outside the component tree, and this listener only
// ever needs "is anything open, and which opened most recently," never anything
// render-relevant.
const openModalCloseHandlers: (() => void)[] = [];

export function registerOpenModal(onClose: () => void): () => void {
  openModalCloseHandlers.push(onClose);
  return () => {
    const index = openModalCloseHandlers.lastIndexOf(onClose);
    if (index !== -1) openModalCloseHandlers.splice(index, 1);
  };
}

// Registered once for the app's lifetime (mount of AuthenticatedApp) and reads
// `onNavigateHome` through a ref so callers can pass a fresh inline closure on every
// render without re-subscribing the native listener each time.
//
// `onNavigateHome` should perform one step of in-app "back" navigation (e.g. leave a
// brand cheat-sheet route, or return from a non-calculator tab to the calculator) and
// return `true` if it did, or `false` if the app is already at its true home screen --
// in which case this hook lets the back press actually exit the app.
export function useNativeBackButton(onNavigateHome: () => boolean): void {
  const handlerRef = useRef(onNavigateHome);
  useEffect(() => {
    handlerRef.current = onNavigateHome;
  });

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    const listenerPromise = App.addListener("backButton", () => {
      const topClose = openModalCloseHandlers[openModalCloseHandlers.length - 1];
      if (topClose) {
        topClose();
        return;
      }
      if (handlerRef.current()) return;
      void App.exitApp();
    });
    return () => {
      void listenerPromise.then(handle => handle.remove());
    };
  }, []);
}
