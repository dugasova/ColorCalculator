import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
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
