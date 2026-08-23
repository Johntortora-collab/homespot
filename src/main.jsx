import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import IOSInstallPrompt from './components/IOSInstallPrompt.jsx'
import { registerServiceWorker } from './lib/push.js'

// Registered once at boot so the push subscription can attach later without a
// reload. Failure is non-fatal — the app works fine, push just stays off.
registerServiceWorker().catch(err => console.warn('Service worker registration failed:', err))

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
      <IOSInstallPrompt />
    </ErrorBoundary>
  </React.StrictMode>,
)
