import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import './i18n'
import './index.css'
import App from './App.tsx'

// registerType: 'autoUpdate' (vite.config.ts) means a new service worker takes over and
// reloads open tabs automatically once it finishes installing -- no user-facing "update
// available" prompt to wire up here. No-op outside of `vite build` (dev serves straight
// from source, unaffected).
registerSW({ immediate: true })

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
