import React from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/inter'
import '@fontsource/instrument-serif/400.css'
import '@fontsource/instrument-serif/400-italic.css'
import './styles/tokens.css'
import './styles/base.css'
import './styles/ui.css'
import './styles/shell.css'
import './styles/features.css'
import App from './app/App'
import { writeSession } from './lib/storage'

// Keep V1 invite links working: https://app/#join=TOKEN → stored, then routed to /join.
const INVITE_KEY = 'manalife-meet-invite'
function captureInvite() {
  const raw = window.location.hash.slice(1)
  if (!raw || raw.startsWith('/')) return
  const token = new URLSearchParams(raw).get('join')
  if (token) {
    writeSession(INVITE_KEY, token)
    window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}#/join`)
  }
}
captureInvite()
// Registered before the router mounts, so this runs first: the router then sees #/join, not #join=…
window.addEventListener('popstate', captureInvite)
window.addEventListener('hashchange', captureInvite)

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
