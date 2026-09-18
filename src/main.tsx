import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { registerSW } from "virtual:pwa-register";
import { Capacitor } from "@capacitor/core";
import { indexedDBLocalPersistence, setPersistence } from "firebase/auth";
import "./i18n";
import "./index.css";
import App from "./App.tsx";
import { auth } from "./firebase";

if (Capacitor.isNativePlatform()) {
  // Assets already ship inside the app package, so a service worker would only add a second,
  // stale cache layer on top of them. IndexedDB persistence instead of the web default
  // (localStorage): a WebView's localStorage is the first thing Android/iOS reclaim under
  // storage pressure, which would silently sign the colorist out mid-shift.
  setPersistence(auth, indexedDBLocalPersistence)
    .catch(err => console.error("Failed to set native auth persistence:", err));
} else {
  // registerType: 'autoUpdate' (vite.config.ts) means a new service worker takes over and
  // reloads open tabs automatically once it finishes installing -- no user-facing "update
  // available" prompt to wire up here. No-op outside of `vite build` (dev serves straight
  // from source, unaffected).
  registerSW({ immediate: true });
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
