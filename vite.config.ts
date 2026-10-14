/// <reference types="vitest/config" />
import { readFileSync } from 'node:fs'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { sentryVitePlugin } from '@sentry/vite-plugin'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  // Source maps are only ever generated to hand to Sentry for de-minified stack traces,
  // and only when all three non-VITE_-prefixed secrets below are present (see
  // .env.example) -- never left in `dist/` for a plain build, and never shipped to the
  // hosted site or the Android APK (filesToDeleteAfterUpload below).
  const uploadSourceMaps = Boolean(env.SENTRY_AUTH_TOKEN && env.SENTRY_ORG && env.SENTRY_PROJECT)
  // package.json is the single source of the app version (android/app/build.gradle reads
  // it too). Read from disk rather than `npm_package_version`, which is only set when vite
  // is launched through an npm script. One release name feeds both the runtime
  // `Sentry.init` (monitoring.ts) and the source-map upload below -- they must match
  // exactly or uploaded maps never attach to incoming errors.
  const appVersion: string = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf-8')).version
  const sentryRelease = `formulist@${appVersion}`

  return {
    define: {
      __BUILD_TIME__: JSON.stringify(new Date().toISOString().slice(0, 16).replace("T", " ")),
      __APP_VERSION__: JSON.stringify(appVersion),
      __SENTRY_RELEASE__: JSON.stringify(sentryRelease),
    },
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.svg', 'apple-touch-icon-180x180.png'],
        manifest: {
          name: 'Formulist — Color Calculator',
          short_name: 'Formulist',
          description: 'Hair-color formula calculator for salon colorists: mixing ratios, developer volume, gray coverage, color correction, bleach, and pre-pigmentation.',
          start_url: '/',
          scope: '/',
          display: 'standalone',
          background_color: '#ffffff',
          theme_color: '#7c3aed',
          icons: [
            { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
            { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
            { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          ],
        },
      }),
      ...(uploadSourceMaps ? [sentryVitePlugin({
        org: env.SENTRY_ORG,
        project: env.SENTRY_PROJECT,
        authToken: env.SENTRY_AUTH_TOKEN,
        release: { name: sentryRelease },
        sourcemaps: { filesToDeleteAfterUpload: ["./dist/**/*.map"] },
      })] : []),
    ],
    test: {
      setupFiles: ['./src/test-setup.ts'],
    },
    build: {
      sourcemap: uploadSourceMaps ? 'hidden' : false,
      rolldownOptions: {
        output: {
          codeSplitting: {
            groups: [
              { test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/, name: 'vendor-react' },
              { test: /node_modules[\\/]@sentry[\\/]/, name: 'vendor-sentry' },
              { test: /node_modules[\\/]@?firebase[\\/]firestore/, name: 'vendor-firebase-firestore' },
              { test: /node_modules[\\/]@?firebase[\\/]auth/, name: 'vendor-firebase-auth' },
              { test: /node_modules[\\/]@?firebase[\\/]storage/, name: 'vendor-firebase-storage' },
              { test: /node_modules[\\/]@?firebase[\\/]analytics/, name: 'vendor-firebase-analytics' },
              { test: /node_modules[\\/](@firebase|firebase)[\\/]/, name: 'vendor-firebase-core' },
              { test: /node_modules[\\/](i18next|react-i18next)[\\/]/, name: 'vendor-i18next' },
            ],
          },
        },
      },
    },
  }
})
