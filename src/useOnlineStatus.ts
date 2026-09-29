import { useSyncExternalStore } from "react";

function subscribe(onChange: () => void) {
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);
  return () => {
    window.removeEventListener("online", onChange);
    window.removeEventListener("offline", onChange);
  };
}

// Drives AuthenticatedApp's offline banner. `navigator.onLine` is a best-effort browser/
// WebView signal (it can be true on a captive portal with no real internet, but it's
// accurate for the case this exists to cover: airplane mode / no Wi-Fi at the salon) --
// good enough to tell the colorist why "Save to history" now says "Saved on device"
// instead of "Saved". Server snapshot defaults to `true` (assume online during SSR/initial
// render, matching this app's client-only rendering -- see main.tsx).
export function useOnlineStatus(): boolean {
  return useSyncExternalStore(subscribe, () => navigator.onLine, () => true);
}
