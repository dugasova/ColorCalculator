import type { CapacitorConfig } from "@capacitor/cli";

// Web assets are bundled into the app package (webDir: the same `dist/` npm run build
// produces for the web deploy) -- no server.url, so the app starts offline and Firestore's
// persistent cache serves already-synced data until the network is back.
const config: CapacitorConfig = {
  appId: "com.formulist.app",
  appName: "Formulist",
  webDir: "dist",
  // Android 15+ (targetSdk 36) forces edge-to-edge. "css" (Capacitor 8's default) makes the
  // webview edge-to-edge and injects the --safe-area-inset-* CSS variables step 4's CSS reads
  // via var(--safe-area-inset-*, env(safe-area-inset-*, 0px)) -- set explicitly so this stays
  // true even if Capacitor's own default ever changes.
  plugins: {
    SystemBars: {
      insetsHandling: "css",
    },
  },
  server: {
    // iOS default is capacitor://localhost, an origin Firebase Auth rejects; https://localhost
    // matches the Android default and is a valid authorized domain. Set now so `cap add ios`
    // later needs no extra change.
    iosScheme: "https",
  },
};

export default config;
