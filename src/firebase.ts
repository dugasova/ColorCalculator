import { initializeApp } from "firebase/app";
import {
    getFirestore,
    initializeFirestore,
    persistentLocalCache,
    persistentMultipleTabManager,
    CACHE_SIZE_UNLIMITED,
} from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

// This module is imported both by the browser app (built by Vite, config injected via
// `import.meta.env`) and by scripts/migrateBuiltInPalette.ts (run under Node/tsx, where
// `.env` is loaded into `process.env` instead, via `tsx --env-file=.env`). Check both so
// the exact same `db`/`auth`/`storage` singletons — and therefore the exact same write
// path — are shared by the app and the migration script, rather than duplicating
// Firebase init.
//
// Each Vite-side lookup below MUST stay a literal `import.meta.env?.KEY` expression,
// written out at the call site rather than indirected through a variable or a computed
// `[key]` lookup: Vite only recognizes and replaces that exact static textual pattern at
// build time. Route it through a helper and the browser build silently ships `undefined`
// for every value — Firebase then fails to initialize with no build-time warning.
function readEnv(viteValue: string | undefined, key: string): string | undefined {
    if (viteValue !== undefined) return viteValue;
    // `process` isn't declared without @types/node, which this browser-facing file
    // doesn't (and shouldn't) depend on; one-off environment-detection cast, not a read
    // of untrusted external data.
    const nodeGlobal = globalThis as unknown as { process?: { env?: Record<string, string | undefined> } };
    return nodeGlobal.process?.env?.[key];
}

// These are public client identifiers, not secrets — a Firebase web app's config ships
// in the built bundle and is always visible via browser devtools regardless of where it
// lives in source. Keeping it out of the repo (see .env.example) mainly buys config
// hygiene (per-environment projects without editing code) and keeps it out of casual
// GitHub scraping. It grants no access by itself; the actual security boundary is
// `firestore.rules` (deployed separately, never shipped to the client) plus each user's
// Firebase Auth session. If this project is ever exposed to untrusted/public traffic,
// harden it with an API key restriction (Google Cloud Console) and Firebase App Check,
// not by hiding the config.
const firebaseConfig = {
    apiKey: readEnv(import.meta.env?.VITE_FIREBASE_API_KEY, 'VITE_FIREBASE_API_KEY'),
    authDomain: readEnv(import.meta.env?.VITE_FIREBASE_AUTH_DOMAIN, 'VITE_FIREBASE_AUTH_DOMAIN'),
    projectId: readEnv(import.meta.env?.VITE_FIREBASE_PROJECT_ID, 'VITE_FIREBASE_PROJECT_ID'),
    storageBucket: readEnv(import.meta.env?.VITE_FIREBASE_STORAGE_BUCKET, 'VITE_FIREBASE_STORAGE_BUCKET'),
    messagingSenderId: readEnv(import.meta.env?.VITE_FIREBASE_MESSAGING_SENDER_ID, 'VITE_FIREBASE_MESSAGING_SENDER_ID'),
    appId: readEnv(import.meta.env?.VITE_FIREBASE_APP_ID, 'VITE_FIREBASE_APP_ID'),
};

export const app = initializeApp(firebaseConfig);
// Persistent (IndexedDB) local cache lets salon staff keep reading cached brand/shade/
// history data and queue formula saves while the salon's connection is down, syncing
// automatically once it's back -- multi-tab so a colorist with the app open in two tabs
// sees consistent data rather than each tab fighting over its own cache. IndexedDB only
// exists in a browser: this module doubles as the Firebase client for the Node-run
// migration scripts (see the comment above), which must keep the plain in-memory client
// or `initializeFirestore` throws immediately on startup.
export const db = typeof indexedDB !== 'undefined'
    ? initializeFirestore(app, {
        localCache: persistentLocalCache({
            cacheSizeBytes: CACHE_SIZE_UNLIMITED,
            tabManager: persistentMultipleTabManager(),
        }),
    })
    : getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);
