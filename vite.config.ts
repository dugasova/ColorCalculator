/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon-180x180.png'],
      manifest: {
        name: 'Huemix — Color Calculator',
        short_name: 'Huemix',
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
  ],
  test: {
    setupFiles: ['./src/test-setup.ts'],
  },
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            { test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/, name: 'vendor-react' },
            { test: /node_modules[\\/]@?firebase[\\/]firestore/, name: 'vendor-firebase-firestore' },
            { test: /node_modules[\\/]@?firebase[\\/]auth/, name: 'vendor-firebase-auth' },
            { test: /node_modules[\\/]@?firebase[\\/]storage/, name: 'vendor-firebase-storage' },
            { test: /node_modules[\\/](@firebase|firebase)[\\/]/, name: 'vendor-firebase-core' },
            { test: /node_modules[\\/](i18next|react-i18next)[\\/]/, name: 'vendor-i18next' },
          ],
        },
      },
    },
  },
})
