import { useState, useEffect } from 'react'
import { pushSupport, permissionState, subscribeToPush, unsubscribeFromPush, isSubscribedHere } from '../lib/push'

const C = {
  card:'#1E1E30', card2:'#252538', amber:'#F5A623',
  amberDim:'rgba(245,166,35,0.12)', amberBrd:'rgba(245,166,35,0.25)',
  sage:'#7BA05B', border:'rgba(255,255,255,0.07)', dim:'rgba(255,255,255,0.45)',
}

/**
 * Opt-in card for offer notifications, shown in the consumer Profile screen.
 *
 * Renders nothing when push can't work at all — no dead toggle, no
 * explanation of a feature this browser will never offer. The one exception is
 * iOS-before-install, where the person CAN get there and just needs to know how.
 */
export default function NotificationToggle() {
  const [support,    setSupport]    = useState({ ok: false, reason: null })
  const [permission, setPermission] = useState('default')
  const [subscribed, setSubscribed] = useState(false)
  const [busy,       setBusy]       = useState(false)
  const [error,      setError]      = useState('')

  useEffect(() => {
    setSupport(pushSupport())
    setPermission(permissionState())
    isSubscribedHere().then(setSubscribed)
  }, [])

  async function handleEnable() {
    setBusy(true)
    setError('')
    const { error: err } = await subscribeToPush()
    setBusy(false)
    setPermission(permissionState())

    if (err) {
      setError(
        err === 'denied'
          ? "Notifications are blocked for Homespot. You'll need to re-allow them in your browser settings for this site."
          : err === 'not-configured'
          ? 'Notifications are not set up yet on this build.'
          : 'Could not turn on notifications. Please try again.'
      )
      return
    }
    setSubscribed(true)
  }

  async function handleDisable() {
    setBusy(true)
    await unsubscribeFromPush()
    setBusy(false)
    setSubscribed(false)
  }

  // Can't work here and never will — say nothing.
  if (!support.ok && support.reason !== 'ios-needs-install') return null

  // iOS, still in Safari. Reachable, just needs the home-screen step first.
  if (support.reason === 'ios-needs-install') {
    return (
      <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12, padding:'13px 15px', marginBottom:8, display:'flex', alignItems:'flex-start', gap:12 }}>
        <div style={{ width:34, height:34, borderRadius:9, background:C.card2, display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, flexShrink:0 }}>🔔</div>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:14, color:'#fff', fontWeight:500, marginBottom:3 }}>Get offer alerts</div>
          <div style={{ fontSize:11.5, color:C.dim, lineHeight:1.55 }}>
            Add Homespot to your home screen first — tap Share, then “Add to Home Screen.”
            Open it from there and this turns on.
          </div>
        </div>
      </div>
    )
  }

  const on = subscribed && permission === 'granted'

  return (
    <div style={{ background:C.card, border:`1px solid ${on ? C.amberBrd : C.border}`, borderRadius:12, padding:'13px 15px', marginBottom:8 }}>
      <div style={{ display:'flex', alignItems:'center', gap:12 }}>
        <div style={{ width:34, height:34, borderRadius:9, background: on ? C.amberDim : C.card2, display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, flexShrink:0 }}>
          {on ? '🔔' : '🔕'}
        </div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:14, color:'#fff', fontWeight:500 }}>Offer alerts</div>
          <div style={{ fontSize:11.5, color:C.dim, marginTop:2, lineHeight:1.5 }}>
            {on
              ? 'On for this device — only from spots you visit'
              : 'Hear about perks from the spots you actually visit'}
          </div>
        </div>
        <button
          onClick={on ? handleDisable : handleEnable}
          disabled={busy}
          style={{
            flexShrink:0,
            background: on ? 'none' : C.amber,
            border: on ? `1px solid ${C.border}` : 'none',
            borderRadius:20, padding:'7px 14px', fontSize:12, fontWeight:600,
            color: on ? '#aaa' : '#13131F',
            cursor: busy ? 'default' : 'pointer', fontFamily:'inherit',
            opacity: busy ? 0.6 : 1,
          }}>
          {busy ? '…' : on ? 'Turn off' : 'Turn on'}
        </button>
      </div>

      {error && (
        <div style={{ marginTop:10, background:'rgba(232,149,109,0.1)', border:'1px solid rgba(232,149,109,0.35)', borderRadius:9, padding:'9px 11px', fontSize:11.5, color:'#E8956D', lineHeight:1.5 }}>
          {error}
        </div>
      )}
    </div>
  )
}
