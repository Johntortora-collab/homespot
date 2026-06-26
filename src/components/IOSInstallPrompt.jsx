import { useState, useEffect } from 'react'

// Detects iPhone/iPad Safari and, when the app isn't already installed to the
// home screen, shows a friendly one-time banner explaining how to add it.
// iOS gives no programmatic install API, so this is the standard approach.
export default function IOSInstallPrompt() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    // Already dismissed once? Respect that.
    let dismissed = false
    try { dismissed = localStorage.getItem('hs_ios_install_dismissed') === '1' } catch {}
    if (dismissed) return

    const ua = window.navigator.userAgent.toLowerCase()
    const isIOS = /iphone|ipad|ipod/.test(ua)

    // "standalone" is true when already launched from the home screen.
    const isStandalone =
      window.navigator.standalone === true ||
      window.matchMedia('(display-mode: standalone)').matches

    // Only iOS Safari (not Chrome/Firefox on iOS, which can't add to home screen
    // the same way) — those use "crios"/"fxios" in the UA.
    const isSafari = !/crios|fxios|edgios/.test(ua)

    if (isIOS && isSafari && !isStandalone) {
      // Small delay so it doesn't slam them the instant the page loads
      const t = setTimeout(() => setShow(true), 2500)
      return () => clearTimeout(t)
    }
  }, [])

  function dismiss() {
    setShow(false)
    try { localStorage.setItem('hs_ios_install_dismissed', '1') } catch {}
  }

  if (!show) return null

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 0, left: 0, right: 0,
        zIndex: 9999,
        padding: '16px 16px calc(16px + env(safe-area-inset-bottom))',
        background: 'linear-gradient(180deg, rgba(19,19,31,0.0), #13131F 22%)',
        animation: 'hsSlideUp 0.4s ease',
      }}
    >
      <style>{`
        @keyframes hsSlideUp { from { transform: translateY(100%); opacity: 0 } to { transform: translateY(0); opacity: 1 } }
      `}</style>
      <div
        style={{
          background: '#1E1E32',
          border: '1px solid rgba(245,166,35,0.3)',
          borderRadius: 18,
          padding: '16px 16px 18px',
          boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
          maxWidth: 440,
          margin: '0 auto',
          position: 'relative',
        }}
      >
        <button
          onClick={dismiss}
          aria-label="Dismiss"
          style={{
            position: 'absolute', top: 12, right: 14,
            background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)',
            fontSize: 18, cursor: 'pointer', lineHeight: 1, padding: 0,
          }}
        >
          ✕
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 13, marginBottom: 12 }}>
          <div
            style={{
              width: 46, height: 46, borderRadius: 12, flexShrink: 0,
              background: '#F5A623',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <svg width={28} height={28} viewBox="0 0 32 32">
              <path d="M16 7L24 14V25H19V19H13V25H8V14Z" fill="#1A1A2E" />
            </svg>
          </div>
          <div>
            <div style={{ fontFamily: 'Fraunces,serif', fontSize: 16, fontWeight: 700, color: '#fff' }}>
              Add Homespot to your home screen
            </div>
            <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>
              Get one-tap access like a real app — no app store needed.
            </div>
          </div>
        </div>

        <div
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            fontSize: 13, color: 'rgba(255,255,255,0.75)',
            background: 'rgba(255,255,255,0.04)',
            borderRadius: 11, padding: '11px 13px',
          }}
        >
          <span>Tap</span>
          {/* iOS share icon */}
          <span
            style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              color: '#3B9EFF', flexShrink: 0,
            }}
          >
            <svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke="#3B9EFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 16V4" />
              <path d="M8 8l4-4 4 4" />
              <path d="M5 12v7a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-7" />
            </svg>
          </span>
          <span>below, then choose</span>
          <span style={{ color: '#fff', fontWeight: 600, whiteSpace: 'nowrap' }}>“Add to Home Screen”</span>
        </div>
      </div>
    </div>
  )
}
