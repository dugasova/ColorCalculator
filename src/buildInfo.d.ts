declare global {
  const __BUILD_TIME__: string;
  // package.json's `version`, injected by vite.config.ts's `define`.
  const __APP_VERSION__: string;
  // `formulist@<version>` -- the same release name the Sentry source-map upload uses.
  const __SENTRY_RELEASE__: string;
}

export {};
