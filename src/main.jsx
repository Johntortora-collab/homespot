import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import IOSInstallPrompt from './components/IOSInstallPrompt.jsx'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
      <IOSInstallPrompt />
    </ErrorBoundary>
  </React.StrictMode>,
)
