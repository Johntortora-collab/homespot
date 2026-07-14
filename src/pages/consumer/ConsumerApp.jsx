import { useState, useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { useAuth } from '../../lib/AuthContext'
import { useSpots, useStamp, useFeedback, useMyCards, useBlockFeed, useTowns, useTownRequest, useFounderStatus, useMyPerks } from '../../lib/hooks'
import { supabase } from '../../lib/supabase'
import { getMascot, getUnlockLabel, TOTAL_LAYERS } from '../../lib/mascotEngine'
import Mascot from '../../components/Mascot'
import QRScanner from '../../components/QRScanner'

const C = {
  bg:'#13131F', card:'#1E1E30', card2:'#252538',
  amber:'#F5A623', amberDim:'rgba(245,166,35,0.12)', amberBrd:'rgba(245,166,35,0.25)',
  sage:'#7BA05B', dim:'rgba(255,255,255,0.45)', muted:'rgba(255,255,255,0.2)',
  ghost:'rgba(255,255,255,0.06)', border:'rgba(255,255,255,0.07)',
}

function Logo({ size=24 }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:7 }}>
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
        <circle cx="16" cy="16" r="16" fill={C.amber}/>
        <path d="M16 7L24 14V25H19V19H13V25H8V14Z" fill={C.bg}/>
        <circle cx="16" cy="13" r="2.5" fill={C.amber}/>
      </svg>
      <span style={{ fontFamily:'Fraunces,serif', fontSize:size*0.78, fontWeight:700, color:'#fff', letterSpacing:'-0.02em' }}>
        home<span style={{ color:C.amber }}>spot</span>
      </span>
    </div>
  )
}

function TownPill({ children }) {
  return <div style={{ display:'inline-flex', alignItems:'center', gap:4, background:C.amberDim, border:`1px solid ${C.amberBrd}`, borderRadius:20, padding:'3px 10px', fontFamily:'Inter,sans-serif', fontSize:10, fontWeight:600, color:C.amber, letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:10 }}>{children}</div>
}

function Label({ children }) {
  return <div style={{ fontFamily:'Inter,sans-serif', fontSize:10, fontWeight:600, color:'#555', letterSpacing:'0.1em', textTransform:'uppercase' }}>{children}</div>
}

// ── Root ──────────────────────────────────────────────────────────────────────
export default function ConsumerApp() {
  const { profile, signOut, session, updateProfile, signUp, signIn, loading: authLoading } = useAuth()
  const { spotId: urlSpotId } = useParams() // present when loaded via /scan/:spotId deep link
  const [screen,      setScreen]      = useState(null)   // null = still deciding; set once profile resolves
  const [townId,      setTownId]      = useState(null)
  const [townData,    setTownData]    = useState(null)
  const [spotId,      setSpotId]      = useState(null)
  const [tab,         setTab]         = useState('home')
  const [cat,         setCat]         = useState('All')
  const [pendingTown, setPendingTown] = useState(null)
  const [authMode,    setAuthMode]    = useState('signup') // 'signup' | 'signin'
  const [showScanner, setShowScanner] = useState(false)
  const [scanFlash,   setScanFlash]   = useState(null) // 'not-found' | null
  const [requestTownAfterAuth, setRequestTownAfterAuth] = useState(false)
  const [autoStamp, setAutoStamp] = useState(false)

  // Decide the landing screen ONCE the profile has actually loaded.
  // This can't be done via useState's initial value: profile is null on the
  // first render (auth is still resolving), so the initial value would always
  // evaluate to 'townselect' and returning users would be sent back to the
  // town picker every single time despite having a town saved.
  useEffect(() => {
    if (authLoading || screen !== null) return

    if (!session) {
      setScreen('townselect')          // brand new visitor
    } else if (profile?.town_id) {
      setTownId(profile.town_id)       // returning user — restore their town
      setTownData(profile.towns || null)
      setScreen('home')
    } else {
      setScreen('townselect')          // signed in but never picked a town
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, session, profile, screen])

  // User picks a town → save it, then go to signup if not logged in
  function selectTown(town) {
    setPendingTown(town)
    if (session) {
      finalizeTown(town)
    } else {
      setScreen('signup')
    }
  }

  async function finalizeTown(town) {
    const t = town || pendingTown

    // No town to finalize — this happens when someone signed up specifically
    // to submit a town request rather than picking an existing one.
    if (!t) {
      if (requestTownAfterAuth) {
        setRequestTownAfterAuth(false)
        setScreen('requesttown')
      }
      return
    }

    setTownId(t.id)
    setTownData(t)
    if (session) {
      await updateProfile({ town_id: t.id })
    }
    setScreen('home')
  }

  async function handleSignup(email, password, name) {
    const { data, error } = await signUp({ email, password, fullName: name, role: 'consumer' })
    if (error) return { needsConfirmation: false, error }

    // Supabase returns a null session when email confirmation is required —
    // that's the signal to show "check your email" instead of finishing signup
    const needsConfirmation = !data?.session
    if (!needsConfirmation) await finalizeTown(null)
    return { needsConfirmation, error: null }
  }

  async function handleSignIn(email, password) {
    const { error } = await signIn({ email, password })
    if (!error) await finalizeTown(null)
    return { error }
  }

  function openSpot(id)  { setSpotId(id); setScreen('spot') }
  function goHome()      { setScreen('home'); setTab('home') }
  function nav(s, t)     { setScreen(s); if (t) setTab(t) }

  // Called by the camera scanner once it decodes a Spot QR
  async function handleScanResult(scannedSpotId) {
    setShowScanner(false)
    // Verify this spot actually exists before navigating
    const { data } = await supabase.from('spots').select('id').eq('id', scannedSpotId).single()
    if (!data) {
      setScanFlash('not-found')
      setTimeout(() => setScanFlash(null), 2400)
      return
    }
    openSpot(scannedSpotId)
  }

  // Deep link support: opening /scan/:spotId — via an NFC tap, or by pointing the
  // phone's native camera at the printed QR. Either way the person is physically at
  // the counter, so we grant the stamp immediately rather than making them scan again.
  // useStamp's once-per-day guard still applies, so re-opening the link does nothing.
  useEffect(() => {
    if (urlSpotId && session && townId) {
      setAutoStamp(true)
      openSpot(urlSpotId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlSpotId, session, townId])

  // Still working out where this person belongs — show the mark, not a flash of
  // the town picker followed by a jump to home.
  if (screen === null) {
    return (
      <div style={{ height:'100vh', background:C.bg, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:14 }}>
        <div style={{ animation:'pulse 1.4s ease-in-out infinite' }}>
          <svg width={40} height={40} viewBox="0 0 32 32">
            <circle cx="16" cy="16" r="16" fill={C.amber}/>
            <path d="M16 7L24 14V25H19V19H13V25H8V14Z" fill={C.bg}/>
          </svg>
        </div>
        <div style={{ fontFamily:'Fraunces,serif', fontSize:14, color:'#555' }}>Loading your town…</div>
        <style>{`@keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.55;transform:scale(0.94)}}`}</style>
      </div>
    )
  }

  const noChrome = ['townselect','signup','requesttown'].includes(screen)

  function handleRequestTownClick() {
    if (session) {
      setScreen('requesttown')
    } else {
      // Not signed in yet — sign up first, then land on the request form
      // instead of a town's home screen.
      setPendingTown(null)
      setAuthMode('signup')
      setScreen('signup')
      setRequestTownAfterAuth(true)
    }
  }

  return (
    <div className="hs-shell" style={{ minHeight:'100vh', minHeight:'100dvh', background:'#0A0A18', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'Inter,sans-serif' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,600;0,9..144,700;1,9..144,400&family=Inter:wght@400;500;600&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        html,body{-webkit-text-size-adjust:100%}
        ::-webkit-scrollbar{display:none}
        input,textarea{outline:none;font-family:inherit}
        input::placeholder,textarea::placeholder{color:#555}
        button{font-family:inherit;cursor:pointer}
        a{-webkit-tap-highlight-color:transparent}
        @keyframes up{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}
        @keyframes pop{0%{transform:scale(0.8);opacity:0}60%{transform:scale(1.06)}100%{transform:scale(1);opacity:1}}
        @keyframes glow{0%,100%{opacity:0.35}50%{opacity:0.8}}
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        @keyframes bounce{0%{transform:scale(0.5) rotate(-8deg);opacity:0}60%{transform:scale(1.1) rotate(3deg)}100%{transform:scale(1) rotate(0);opacity:1}}

        /* Desktop / wide viewports: show as a contained phone frame */
        .hs-shell { padding:16px; }
        .hs-phone {
          width:375px; height:780px; max-height:92vh;
          border-radius:44px;
          box-shadow:0 48px 120px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.07);
        }

        /* Real phones / narrow viewports: fill the whole screen, no frame chrome */
        @media (max-width: 520px) {
          .hs-shell { padding:0; }
          .hs-phone {
            width:100vw; height:100vh; height:100dvh; max-height:none;
            border-radius:0;
            box-shadow:none;
          }
          .hs-statusbar { display:none; }
          .hs-bottomnav { padding-bottom:max(8px, env(safe-area-inset-bottom)) !important; height:calc(70px + env(safe-area-inset-bottom)) !important; }
        }
      `}</style>

      <div className="hs-phone" style={{ background:C.bg, overflow:'hidden', display:'flex', flexDirection:'column' }}>

        {/* Status bar (desktop preview only — real phones already show their own) */}
        {!noChrome && (
          <div className="hs-statusbar" style={{ height:44, background:C.bg, display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 20px', flexShrink:0 }}>
            <span style={{ fontSize:11, color:'#fff', opacity:0.5 }}>9:41</span>
            <Logo size={18}/>
            <span onClick={signOut} style={{ fontSize:11, color:C.amber, cursor:'pointer', fontWeight:600 }}>Sign out</span>
          </div>
        )}

        {/* Screens */}
        <div style={{ flex:1, overflow:'hidden' }}>
          {screen==='townselect' && <TownSelect onSelect={selectTown} onRequestTown={handleRequestTownClick}/>}
          {screen==='signup'     && <SignupScreen town={pendingTown} authMode={authMode} setAuthMode={setAuthMode} onSignup={handleSignup} onSignIn={handleSignIn} onBack={()=>{ setRequestTownAfterAuth(false); setScreen('townselect') }}/>}
          {screen==='requesttown' && <RequestTownScreen onBack={()=>setScreen(townId ? 'home' : 'townselect')} onSubmitted={()=>setScreen(townId ? 'home' : 'townselect')}/>}
          {screen==='home'       && <Home townId={townId} town={townData} cat={cat} setCat={setCat} onSpot={openSpot} onNav={nav}/>}
          {screen==='spot'       && <SpotDetail spotId={spotId} onBack={goHome} autoStamp={autoStamp} onAutoStampDone={()=>setAutoStamp(false)}/>}
          {screen==='perks'      && <Perks onSpot={openSpot}/>}
          {screen==='block'      && <Block townId={townId} town={townData}/>}
          {screen==='profile'    && <Profile onSwitch={()=>setScreen('townselect')} onNav={nav}/>}
        </div>

        {/* Bottom nav */}
        {!noChrome && <Nav tab={tab} onTab={(s,t)=>nav(s,t)} onScan={()=>setShowScanner(true)}/>}
      </div>

      {/* Full-screen camera scanner */}
      {showScanner && (
        <QRScanner
          onScan={handleScanResult}
          onClose={()=>setShowScanner(false)}
        />
      )}

      {/* "Spot not found" toast */}
      {scanFlash === 'not-found' && (
        <div style={{ position:'fixed', top:24, left:'50%', transform:'translateX(-50%)', background:'#2A2A42', border:`1px solid ${C.border}`, borderRadius:14, padding:'12px 20px', color:'#fff', fontSize:13, fontFamily:'Inter,sans-serif', zIndex:300, animation:'up 0.3s ease', boxShadow:'0 8px 24px rgba(0,0,0,0.4)' }}>
          ⚠ That QR code doesn't match a Homespot business
        </div>
      )}
    </div>
  )
}

// ── TOWN SELECT ───────────────────────────────────────────────────────────────
function TownSelect({ onSelect, onRequestTown }) {
  const { towns, loading } = useTowns()
  const [q, setQ] = useState('')
  const list = towns.filter(t => t.name.toLowerCase().includes(q.toLowerCase()))

  return (
    <div style={{ height:'100%', overflowY:'auto', background:C.bg }}>
      <div style={{ background:'linear-gradient(160deg,#211540,#13131F 65%)', padding:'28px 20px 24px', position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', inset:0, backgroundImage:'radial-gradient(circle,rgba(245,166,35,0.1) 1px,transparent 1px)', backgroundSize:'18px 18px' }}/>
        <div style={{ position:'relative', zIndex:1 }}>
          <Logo size={22}/>
          <h1 style={{ fontFamily:'Fraunces,serif', fontSize:26, color:'#fff', fontWeight:700, marginTop:14, lineHeight:1.2 }}>
            Find your<br/><span style={{ color:C.amber, fontStyle:'italic' }}>hometown</span>
          </h1>
          <p style={{ fontSize:13, color:'rgba(255,255,255,0.45)', marginTop:8 }}>Pick your town to see local spots and perks</p>
        </div>
      </div>

      <div style={{ padding:'14px 16px 6px' }}>
        <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search your town..." style={{ width:'100%', background:C.card, border:`1px solid ${C.border}`, borderRadius:13, padding:'12px 14px', fontSize:14, color:'#fff' }}/>
      </div>

      <div style={{ padding:'6px 16px 16px' }}>
        <div style={{ fontFamily:'Inter,sans-serif', fontSize:10, fontWeight:600, color:'#555', letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:10, marginTop:8 }}>
          Nearby towns
        </div>
        {loading ? (
          <div style={{ textAlign:'center', padding:'40px', color:C.dim, fontSize:14 }}>Loading towns…</div>
        ) : list.map(t => (
          <div
            key={t.id}
            onClick={() => t.active && onSelect(t)}
            style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:14, padding:'14px 15px', marginBottom:9, display:'flex', alignItems:'center', gap:12, cursor:t.active?'pointer':'default', opacity:t.active?1:0.45, transition:'background 0.15s' }}
          >
            <div style={{ width:44, height:44, borderRadius:12, background:C.amberDim, border:`1px solid ${C.amberBrd}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, flexShrink:0 }}>
              {t.emoji}
            </div>
            <div style={{ flex:1 }}>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <span style={{ fontFamily:'Fraunces,serif', fontSize:15, color:'#fff', fontWeight:600 }}>{t.name}</span>
                <span style={{ fontSize:11, color:'#555' }}>{t.state}</span>
                {!t.active && <span style={{ fontSize:9, color:'#555', background:C.card2, border:'1px solid #333', borderRadius:6, padding:'1px 6px', fontWeight:700 }}>COMING SOON</span>}
              </div>
              <div style={{ fontSize:11, color:'#666', marginTop:2 }}>{t.population} residents</div>
            </div>
            {t.active && <span style={{ color:'#444', fontSize:16 }}>›</span>}
          </div>
        ))}
      </div>

      {/* Request a town that isn't listed */}
      <div style={{ padding:'0 16px 32px' }}>
        <div style={{ background:C.card, border:'1px dashed rgba(255,255,255,0.12)', borderRadius:14, padding:'16px', textAlign:'center' }}>
          <div style={{ fontSize:22, marginBottom:8 }}>🏘️</div>
          <div style={{ fontFamily:'Fraunces,serif', fontSize:14, color:'#fff', marginBottom:4 }}>Don't see your town?</div>
          <div style={{ fontSize:12, color:'#666', marginBottom:12 }}>We're growing fast — let us know where to go next.</div>
          <button onClick={onRequestTown} style={{ background:C.amberDim, border:`1px solid ${C.amberBrd}`, borderRadius:20, padding:'8px 18px', fontSize:12, fontWeight:600, color:C.amber, cursor:'pointer' }}>
            Request my town →
          </button>
        </div>
      </div>
    </div>
  )
}

// ── REQUEST TOWN ───────────────────────────────────────────────────────────────
function RequestTownScreen({ onBack, onSubmitted }) {
  const { session } = useAuth()
  const { submitRequest, submitting, submitted } = useTownRequest()
  const [townName, setTownName] = useState('')
  const [state,    setState]    = useState('')
  const [note,     setNote]     = useState('')

  async function handleSubmit() {
    if (!townName.trim()) return
    await submitRequest({ townName: townName.trim(), state: state.trim() || null, note: note.trim() || null })
  }

  if (submitted) return (
    <div style={{ height:'100%', background:C.bg, display:'flex', alignItems:'center', justifyContent:'center', padding:'0 28px', textAlign:'center' }}>
      <div style={{ animation:'up 0.4s ease' }}>
        <div style={{ fontSize:44, marginBottom:16 }}>🎉</div>
        <div style={{ fontFamily:'Fraunces,serif', fontSize:20, color:'#fff', fontWeight:700, marginBottom:8 }}>Thanks!</div>
        <div style={{ fontSize:13, color:'#888', lineHeight:1.6, marginBottom:24 }}>
          We've got your request for <strong style={{ color:'#fff' }}>{townName}</strong>. We'll reach out once it's live.
        </div>
        <button onClick={onSubmitted} style={{ background:C.amber, border:'none', borderRadius:13, padding:'12px 28px', fontSize:14, fontWeight:600, color:C.bg, cursor:'pointer' }}>
          Done
        </button>
      </div>
    </div>
  )

  return (
    <div style={{ height:'100%', overflowY:'auto', background:C.bg }}>
      <div style={{ background:'linear-gradient(160deg,#211540,#13131F 65%)', padding:'24px 20px 26px', position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', inset:0, backgroundImage:'radial-gradient(circle,rgba(245,166,35,0.1) 1px,transparent 1px)', backgroundSize:'18px 18px' }}/>
        <div style={{ position:'relative', zIndex:1 }}>
          <button onClick={onBack} style={{ background:'rgba(255,255,255,0.08)', border:'none', color:'#fff', fontSize:12, padding:'6px 12px', borderRadius:20, cursor:'pointer', marginBottom:14 }}>← Back</button>
          <div style={{ fontSize:32, marginBottom:8 }}>🏘️</div>
          <h2 style={{ fontFamily:'Fraunces,serif', fontSize:22, color:'#fff', fontWeight:700 }}>Request your town</h2>
          <p style={{ fontSize:12, color:'rgba(255,255,255,0.45)', marginTop:5 }}>Tell us where Homespot should go next</p>
        </div>
      </div>

      <div style={{ padding:'22px 22px 40px', display:'flex', flexDirection:'column', gap:14 }}>
        <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
          <label style={{ fontSize:12, color:'#888' }}>Town name</label>
          <input value={townName} onChange={e=>setTownName(e.target.value)} placeholder="e.g. Hoboken" style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:11, padding:'12px 14px', fontSize:14, color:'#fff' }}/>
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
          <label style={{ fontSize:12, color:'#888' }}>State (optional)</label>
          <input value={state} onChange={e=>setState(e.target.value)} placeholder="e.g. NJ" style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:11, padding:'12px 14px', fontSize:14, color:'#fff' }}/>
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
          <label style={{ fontSize:12, color:'#888' }}>Anything else? (optional)</label>
          <textarea value={note} onChange={e=>setNote(e.target.value)} placeholder="Why this town, or any businesses you'd love to see on Homespot…" style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:11, padding:'12px 14px', fontSize:14, color:'#fff', resize:'none', height:80 }}/>
        </div>

        <button
          onClick={handleSubmit}
          disabled={!townName.trim() || submitting}
          style={{ background:townName.trim()&&!submitting?C.amber:'#252538', border:'none', borderRadius:13, padding:'14px', fontSize:15, fontWeight:600, color:townName.trim()&&!submitting?C.bg:'#555', transition:'all 0.2s', marginTop:6 }}
        >
          {submitting ? 'Sending…' : 'Submit request →'}
        </button>
      </div>
    </div>
  )
}

// ── SIGNUP / SIGN IN ──────────────────────────────────────────────────────────
function SignupScreen({ town, authMode, setAuthMode, onSignup, onSignIn, onBack }) {
  const { signInWithGoogle } = useAuth()
  const [name,     setName]     = useState('')
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')
  const [awaitingConfirm, setAwaitingConfirm] = useState(false)

  async function handleSubmit() {
    setError('')
    setLoading(true)
    if (authMode === 'signup') {
      const { needsConfirmation, error: err } = await onSignup(email, password, name)
      setLoading(false)
      if (err) { setError(err.message); return }
      if (needsConfirmation) { setAwaitingConfirm(true); return }
    } else {
      const { error: err } = await onSignIn(email, password)
      setLoading(false)
      if (err) setError(err.message)
    }
  }

  async function handleGoogleSignIn() {
    setError('')
    const { error: err } = await signInWithGoogle('consumer')
    if (err) setError(err.message)
    // On success the browser redirects away to Google and back — nothing
    // further happens in this render.
  }

  const ready = authMode === 'signup'
    ? name.trim() && email.includes('@') && password.length >= 6
    : email.includes('@') && password.length >= 6

  if (awaitingConfirm) return (
    <div style={{ height:'100%', overflowY:'auto', background:C.bg, display:'flex', alignItems:'center', justifyContent:'center', padding:'0 24px' }}>
      <div style={{ textAlign:'center', maxWidth:300, animation:'up 0.4s ease' }}>
        <div style={{ fontSize:48, marginBottom:18 }}>💌</div>
        <h2 style={{ fontFamily:'Fraunces,serif', fontSize:22, color:'#fff', fontWeight:700, marginBottom:10 }}>Check your email</h2>
        <p style={{ fontSize:13, color:'#888', lineHeight:1.6, marginBottom:6 }}>
          We sent a confirmation link to
        </p>
        <p style={{ fontSize:14, color:C.amber, fontWeight:600, marginBottom:18 }}>{email}</p>
        <p style={{ fontSize:13, color:'#666', lineHeight:1.6, marginBottom:24 }}>
          Tap the link in that email to activate your account, then come back here and sign in.
        </p>
        <button onClick={()=>{ setAwaitingConfirm(false); setAuthMode('signin') }} style={{ background:C.amber, border:'none', borderRadius:13, padding:'12px 28px', fontSize:14, fontWeight:600, color:C.bg, cursor:'pointer' }}>
          Back to sign in
        </button>
      </div>
    </div>
  )

  return (
    <div style={{ height:'100%', overflowY:'auto', background:C.bg }}>
      <div style={{ background:'linear-gradient(160deg,#211540,#13131F 65%)', padding:'24px 20px 26px', textAlign:'center', position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', inset:0, backgroundImage:'radial-gradient(circle,rgba(245,166,35,0.1) 1px,transparent 1px)', backgroundSize:'18px 18px' }}/>
        <div style={{ position:'relative', zIndex:1 }}>
          <button onClick={onBack} style={{ position:'absolute', left:0, top:0, background:'rgba(255,255,255,0.08)', border:'none', color:'#fff', fontSize:12, padding:'6px 12px', borderRadius:20, cursor:'pointer' }}>← Back</button>
          <div style={{ fontSize:34, marginBottom:10 }}>{town?.emoji || '📍'}</div>
          <h2 style={{ fontFamily:'Fraunces,serif', fontSize:20, color:'#fff', fontWeight:700 }}>
            {authMode === 'signup' ? `Join ${town?.name || 'Homespot'}` : 'Welcome back'}
          </h2>
          <p style={{ fontSize:12, color:'rgba(255,255,255,0.45)', marginTop:5 }}>
            {authMode === 'signup' ? `${town?.population} residents · Free to join` : 'Sign in to your account'}
          </p>
        </div>
      </div>

      <div style={{ padding:'22px 22px 40px', display:'flex', flexDirection:'column', gap:14 }}>
        {/* Toggle */}
        <div style={{ display:'flex', background:C.card, borderRadius:12, padding:4 }}>
          {['signup','signin'].map(mode => (
            <button key={mode} onClick={()=>{ setAuthMode(mode); setError('') }} style={{ flex:1, background:authMode===mode?C.amber:'none', border:'none', borderRadius:9, padding:'9px', fontSize:13, fontWeight:600, color:authMode===mode?C.bg:'#555', transition:'all 0.2s' }}>
              {mode === 'signup' ? 'Create account' : 'Sign in'}
            </button>
          ))}
        </div>

        {/* Google sign-in */}
        <button onClick={handleGoogleSignIn} style={{ background:'#fff', border:'none', borderRadius:11, padding:'12px', fontSize:14, fontWeight:600, color:'#111', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:10 }}>
          <span style={{ fontFamily:'Georgia,serif', color:'#4285F4', fontWeight:700, fontSize:15 }}>G</span> Continue with Google
        </button>

        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ flex:1, height:1, background:C.ghost }} />
          <span style={{ fontFamily:'Inter,sans-serif', fontSize:11, color:'#555' }}>or use email</span>
          <div style={{ flex:1, height:1, background:C.ghost }} />
        </div>

        {authMode === 'signup' && (
          <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
            <label style={{ fontSize:12, color:'#888' }}>Your name</label>
            <input value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. Jordan Rivera" style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:11, padding:'12px 14px', fontSize:14, color:'#fff', width:'100%' }}/>
          </div>
        )}

        <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
          <label style={{ fontSize:12, color:'#888' }}>Email</label>
          <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="your@email.com" style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:11, padding:'12px 14px', fontSize:14, color:'#fff', width:'100%' }}/>
        </div>

        <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
          <label style={{ fontSize:12, color:'#888' }}>Password</label>
          <input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder={authMode==='signup'?'At least 6 characters':'••••••••'} style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:11, padding:'12px 14px', fontSize:14, color:'#fff', width:'100%' }}/>
        </div>

        {error && (
          <div style={{ background:'rgba(220,38,38,0.1)', border:'1px solid rgba(220,38,38,0.3)', borderRadius:10, padding:'10px 13px', fontSize:13, color:'#F87171' }}>
            ⚠ {error}
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={!ready || loading}
          style={{ background:ready&&!loading?C.amber:'#252538', border:'none', borderRadius:13, padding:'14px', fontSize:15, fontWeight:600, color:ready&&!loading?C.bg:'#555', transition:'all 0.2s', boxShadow:ready&&!loading?'0 6px 20px rgba(245,166,35,0.35)':'none', marginTop:4 }}
        >
          {loading ? 'Please wait…' : authMode==='signup' ? `Join ${town?.name||'Homespot'} →` : 'Sign in →'}
        </button>

        <p style={{ fontSize:11, color:'#444', textAlign:'center', lineHeight:1.6 }}>
          By joining, you agree to our <a href="/terms" target="_blank" style={{ color:'#666', textDecoration:'underline' }}>Terms</a> and <a href="/privacy" target="_blank" style={{ color:'#666', textDecoration:'underline' }}>Privacy Policy</a>. Homespot never sells your data or shows you ads.
        </p>
      </div>
    </div>
  )
}

// ── HOME ──────────────────────────────────────────────────────────────────────
function Home({ townId, town, cat, setCat, onSpot, onNav }) {
  const { spots, loading } = useSpots(townId)
  const cats = ['All','Food','Coffee','Salon','Books','Auto','Gifts']
  const filtered = cat === 'All' ? spots : spots.filter(s => s.category === cat)
  const withOffers = spots.filter(s => s.latest_offer)
  const [showBanner, setShowBanner] = useState(true)

  return (
    <div style={{ height:'100%', overflowY:'auto', background:C.bg }}>
      <div style={{ background:'linear-gradient(160deg,#211540,#13131F 58%)', padding:'18px 18px 24px', position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', inset:0, backgroundImage:'radial-gradient(circle,rgba(245,166,35,0.13) 1px,transparent 1px)', backgroundSize:'18px 18px', zIndex:1 }}/>
        <div style={{ position:'relative', zIndex:2 }}>
          <TownPill>📍 {town?.name || 'Your town'}, {town?.state || ''}</TownPill>
          <h1 style={{ fontFamily:'Fraunces,serif', fontSize:28, color:'#fff', fontWeight:700, lineHeight:1.15, marginBottom:6 }}>
            Your <span style={{ color:C.amber, fontStyle:'italic' }}>spots</span>
          </h1>
          <p style={{ fontSize:12, color:C.dim }}>{spots.length} spots nearby</p>
        </div>
      </div>

      {showBanner && (
        <div style={{ margin:'14px 16px 0', background:C.sage+'18', border:`1px solid ${C.sage}45`, borderRadius:13, padding:'12px 14px', display:'flex', alignItems:'flex-start', gap:10, animation:'up 0.3s ease' }}>
          <span style={{ fontSize:16, lineHeight:1 }}>🧪</span>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:12, fontWeight:600, color:'#fff', marginBottom:2 }}>We're testing Homespot in Clark, NJ</div>
            <div style={{ fontSize:11, color:'rgba(255,255,255,0.55)', lineHeight:1.5 }}>Other towns are here for preview, but Clark is where we're running our pilot right now. More towns coming soon!</div>
          </div>
          <button onClick={()=>setShowBanner(false)} style={{ background:'none', border:'none', color:'rgba(255,255,255,0.4)', fontSize:14, cursor:'pointer', padding:0, lineHeight:1 }}>✕</button>
        </div>
      )}

      {withOffers.length > 0 && (
        <>
          <div style={{ padding:'16px 16px 8px' }}><Label>Local Perks Today 🔥</Label></div>
          <div style={{ display:'flex', gap:11, padding:'4px 16px', overflowX:'auto' }}>
            {withOffers.map(s => (
              <div key={s.id} onClick={()=>onSpot(s.id)} style={{ minWidth:135, background:C.card, border:`1px solid ${C.amberBrd}`, borderRadius:14, padding:12, display:'flex', flexDirection:'column', cursor:'pointer', flexShrink:0 }}>
                <div style={{ fontSize:24, marginBottom:5 }}>{s.emoji}</div>
                <div style={{ fontFamily:'Fraunces,serif', fontSize:12, color:'#fff', fontWeight:600, marginBottom:2 }}>{s.name}</div>
                <div style={{ fontSize:10, color:C.amber, lineHeight:1.3, flex:1 }}>{s.latest_offer}</div>
                <div style={{ marginTop:8, background:C.amber, borderRadius:20, padding:'3px 9px', fontSize:9, fontWeight:600, color:C.bg, alignSelf:'flex-start' }}>Grab it →</div>
              </div>
            ))}
          </div>
        </>
      )}

      <div style={{ display:'flex', gap:8, padding:'16px 16px 0', overflowX:'auto' }}>
        {cats.map(c=>(
          <button key={c} onClick={()=>setCat(c)} style={{ background:c===cat?C.amber:C.card2, color:c===cat?C.bg:'#aaa', fontFamily:'Inter,sans-serif', fontSize:11, fontWeight:c===cat?600:400, padding:'5px 13px', borderRadius:20, border:'none', cursor:'pointer', whiteSpace:'nowrap', flexShrink:0 }}>{c}</button>
        ))}
      </div>

      <div style={{ padding:'12px 16px 100px' }}>
        {loading ? (
          <div style={{ textAlign:'center', padding:'40px', color:C.dim }}>Loading spots…</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign:'center', padding:'48px 24px' }}>
            <div style={{ fontSize:36, marginBottom:12 }}>🏪</div>
            <div style={{ fontFamily:'Fraunces,serif', fontSize:18, color:'#fff', marginBottom:6 }}>No spots yet</div>
            <div style={{ fontSize:13, color:'#555', lineHeight:1.6 }}>Businesses in {town?.name} haven't joined Homespot yet. Share it with your favourite local spots!</div>
          </div>
        ) : filtered.map((s,i) => (
          <div key={s.id} onClick={()=>onSpot(s.id)} style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:14, padding:12, marginBottom:9, display:'flex', gap:10, alignItems:'center', cursor:'pointer', animation:'up 0.3s ease', animationDelay:`${i*0.05}s`, animationFillMode:'both' }}>
            <div style={{ width:4, background:s.color||C.amber, borderRadius:3, alignSelf:'stretch', flexShrink:0 }}/>
            <div style={{ fontSize:30 }}>{s.emoji}</div>
            <div style={{ flex:1 }}>
              <div style={{ fontFamily:'Fraunces,serif', fontSize:14, color:'#fff', fontWeight:600, marginBottom:2 }}>{s.name}</div>
              <div style={{ fontSize:11, color:'#555', marginBottom:6 }}>{s.tagline}</div>
              <div style={{ display:'flex', gap:3 }}>
                {Array.from({length:s.stamps_required}).map((_,si)=>(
                  <div key={si} style={{ width:7, height:7, borderRadius:'50%', background:si<(s.my_stamps||0)?s.color||C.amber:C.card2, border:`1px solid ${si<(s.my_stamps||0)?s.color||C.amber:'#333'}` }}/>
                ))}
              </div>
            </div>
            {s.latest_offer && <div style={{ background:C.amber, color:C.bg, fontSize:8, fontWeight:700, padding:'2px 6px', borderRadius:6, flexShrink:0 }}>PERK</div>}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── SPOT DETAIL ───────────────────────────────────────────────────────────────
function SpotDetail({ spotId, onBack, autoStamp = false, onAutoStampDone = () => {} }) {
  const { profile } = useAuth()
  const [spot,    setSpot]    = useState(null)
  const [loading, setLoading] = useState(true)
  const { addStamp, loading: stamping } = useStamp()
  const { submitFeedback } = useFeedback()
  const [showReveal,  setShowReveal]  = useState(false)
  const [revealStamps, setRevealStamps] = useState(0)
  const [perkEarned,  setPerkEarned]  = useState(false)
  const [showAlreadyScanned, setShowAlreadyScanned] = useState(false)
  const [showScanner, setShowScanner] = useState(false)
  const [scanMismatch, setScanMismatch] = useState(false)
  const [mood,        setMood]        = useState(null)
  const [note,        setNote]        = useState('')
  const [fbSent,      setFbSent]      = useState(false)

  useEffect(() => {
    if (!spotId) return
    setLoading(true)
    supabase.from('spots_with_stamps').select('*').eq('id', spotId).single()
      .then(({ data }) => { setSpot(data); setLoading(false) })
  }, [spotId])

  // Arrived by tapping an NFC tag (or the printed QR via the native camera):
  // stamp immediately, once the spot has loaded. The ref guard keeps this from
  // double-firing under React StrictMode's double-invoked effects.
  const autoStampFired = useRef(false)
  useEffect(() => {
    if (!autoStamp || !spot || autoStampFired.current) return
    autoStampFired.current = true
    applyStamp().finally(onAutoStampDone)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStamp, spot])

  async function applyStamp() {
    if (!spot || stamping) return
    const { perkEarned: earned, alreadyScanned } = await addStamp(spot.id)

    if (alreadyScanned) {
      setShowAlreadyScanned(true)
      setTimeout(() => setShowAlreadyScanned(false), 2600)
      return
    }

    const newCount = earned ? spot.stamps_required : (spot.my_stamps || 0) + 1
    setSpot(s => ({ ...s, my_stamps: earned ? 0 : newCount })) // card resets after perk, matches useStamp logic
    setRevealStamps(newCount)
    setPerkEarned(earned)
    setShowReveal(true)
  }

  // Opens the real camera. Only stamps if the scanned QR matches THIS spot —
  // prevents accidentally stamping the wrong business if a stray code is in frame.
  function handleScanResult(scannedSpotId) {
    setShowScanner(false)
    if (scannedSpotId !== spot.id) {
      setScanMismatch(true)
      setTimeout(() => setScanMismatch(false), 2600)
      return
    }
    applyStamp()
  }

  if (loading) return <div style={{ height:'100%', display:'flex', alignItems:'center', justifyContent:'center', background:C.bg, color:C.dim }}>Loading…</div>
  if (!spot)   return <div style={{ height:'100%', display:'flex', alignItems:'center', justifyContent:'center', background:C.bg, color:C.dim }}>Spot not found</div>

  const myStamps = spot.my_stamps || 0
  const mascot = getMascot(spot.category, spot.id)

  async function handleFeedback() {
    if (mood === null) return
    await submitFeedback({ spotId: spot.id, mood: mood+1, note })
    setFbSent(true)
  }

  return (
    <div style={{ height:'100%', overflowY:'auto', background:C.bg, position:'relative' }}>
      <div style={{ background:`linear-gradient(160deg,${spot.color||C.amber}28,#13131F 62%)`, padding:'14px 16px 22px' }}>
        <button onClick={onBack} style={{ background:'rgba(255,255,255,0.08)', border:'none', color:'#fff', fontFamily:'Inter,sans-serif', fontSize:12, padding:'6px 12px', borderRadius:20, cursor:'pointer', marginBottom:8 }}>← Spots</button>
        <div style={{ textAlign:'center', paddingTop:4 }}>
          <div style={{ fontSize:48, marginBottom:8 }}>{spot.emoji}</div>
          <h2 style={{ fontFamily:'Fraunces,serif', fontSize:22, color:'#fff', fontWeight:700, marginBottom:3 }}>{spot.name}</h2>
          <div style={{ fontSize:11, color:'#aaa' }}>{spot.tagline}</div>
        </div>
      </div>

      <div style={{ padding:'0 16px 100px' }}>
        {spot.latest_offer && (
          <div style={{ background:'rgba(245,166,35,0.08)', border:`1px solid ${C.amberBrd}`, borderRadius:11, padding:'10px 13px', display:'flex', gap:9, marginBottom:13, marginTop:6 }}>
            <span>🔥</span>
            <span style={{ fontFamily:'Inter,sans-serif', fontSize:12, color:C.amber }}>{spot.latest_offer}</span>
          </div>
        )}

        {/* Mascot card */}
        <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:18, padding:16, marginBottom:16 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
            <div>
              <div style={{ fontFamily:'Fraunces,serif', fontSize:14, color:'#fff', fontWeight:600 }}>
                {myStamps > 0 ? mascot.name : 'Your buddy'}
              </div>
              <div style={{ fontSize:11, color:'#666' }}>
                {myStamps > 0 ? getUnlockLabel(myStamps) : 'Scan once to meet them!'}
              </div>
            </div>
            <div style={{ background:C.amber, color:C.bg, fontSize:11, fontWeight:700, padding:'4px 10px', borderRadius:20 }}>{myStamps}/{spot.stamps_required}</div>
          </div>

          {/* Character display */}
          <div style={{ display:'flex', alignItems:'center', justifyContent:'center', padding:'8px 0 4px' }}>
            <Mascot mascot={mascot} stamps={myStamps} size={150} customerName={profile?.full_name?.split(' ')[0]} />
          </div>

          {/* Stamp dots (secondary, smaller now) */}
          <div style={{ display:'flex', gap:5, justifyContent:'center', marginTop:8, marginBottom:10 }}>
            {Array.from({length:spot.stamps_required}).map((_,i)=>(
              <div key={i} style={{ width:9, height:9, borderRadius:'50%', background:i<myStamps?(spot.color||C.amber):C.card2, border:`1px solid ${i<myStamps?(spot.color||C.amber):'#333'}` }}/>
            ))}
          </div>

          <div style={{ background:C.card2, borderRadius:20, height:4, overflow:'hidden', marginBottom:7 }}>
            <div style={{ width:`${(myStamps/spot.stamps_required)*100}%`, height:'100%', background:`linear-gradient(90deg,${spot.color||C.amber},${C.amber})`, borderRadius:20, transition:'width 0.8s' }}/>
          </div>
          <div style={{ fontSize:11, color:'#555', textAlign:'center' }}>{spot.stamps_required-myStamps} stamps to earn: {spot.perk}</div>
        </div>

        <div style={{ textAlign:'center', marginBottom:20 }}>
          <div style={{ fontSize:12, color:'#555', marginBottom:11 }}>At the register? Scan their QR to add a stamp</div>
          <button onClick={()=>setShowScanner(true)} disabled={stamping} style={{ background:`linear-gradient(135deg,${C.amber},#E8956D)`, border:'none', borderRadius:20, padding:'13px 28px', fontSize:14, fontWeight:600, color:C.bg, cursor:'pointer', display:'inline-flex', alignItems:'center', gap:9, boxShadow:'0 8px 24px rgba(245,166,35,0.35)' }}>
            <span>⬡</span> {stamping ? 'Adding…' : 'Scan Spot QR'}
          </button>
          {showAlreadyScanned && (
            <div style={{ marginTop:12, background:'rgba(123,160,91,0.12)', border:`1px solid ${C.sage}40`, borderRadius:12, padding:'10px 14px', fontSize:12, color:C.sage, animation:'up 0.3s ease', display:'inline-flex', alignItems:'center', gap:7 }}>
              <span>✓</span> Already stamped today — come back tomorrow!
            </div>
          )}
          {scanMismatch && (
            <div style={{ marginTop:12, background:'rgba(232,85,85,0.12)', border:'1px solid rgba(232,85,85,0.3)', borderRadius:12, padding:'10px 14px', fontSize:12, color:'#E88585', animation:'up 0.3s ease', display:'inline-flex', alignItems:'center', gap:7 }}>
              <span>⚠</span> That QR belongs to a different spot
            </div>
          )}
        </div>

        {showScanner && (
          <QRScanner onScan={handleScanResult} onClose={()=>setShowScanner(false)} />
        )}

        {!fbSent ? (
          <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:18, padding:15 }}>
            <div style={{ fontFamily:'Fraunces,serif', fontSize:14, color:'#fff', fontWeight:600, marginBottom:11 }}>How was your visit?</div>
            <div style={{ display:'flex', gap:7, justifyContent:'center', marginBottom:12 }}>
              {[['😐','Meh'],['🙂','Good'],['😊','Great'],['🤩','Loved it']].map(([em,lb],i)=>(
                <div key={i} onClick={()=>setMood(i)} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:3, cursor:'pointer', background:mood===i?`${spot.color||C.amber}22`:C.card2, border:`2px solid ${mood===i?spot.color||C.amber:'transparent'}`, borderRadius:11, padding:'7px 5px', minWidth:52, transition:'all 0.15s' }}>
                  <span style={{ fontSize:20 }}>{em}</span>
                  <span style={{ fontSize:9, color:mood===i?spot.color||C.amber:'#555' }}>{lb}</span>
                </div>
              ))}
            </div>
            <textarea value={note} onChange={e=>setNote(e.target.value)} placeholder="Leave a note for the owner…" style={{ width:'100%', background:C.card2, border:`1px solid ${C.border}`, borderRadius:11, padding:'9px 12px', fontSize:12, color:'#fff', resize:'none', height:54, marginBottom:9 }}/>
            <button onClick={handleFeedback} disabled={mood===null} style={{ width:'100%', background:mood!==null?'rgba(245,166,35,0.1)':C.card2, border:`1px solid ${mood!==null?C.amberBrd:C.border}`, borderRadius:11, padding:'10px', fontSize:13, fontWeight:600, color:mood!==null?C.amber:'#555', cursor:mood!==null?'pointer':'default' }}>
              Send feedback
            </button>
          </div>
        ) : (
          <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:18, padding:'20px', textAlign:'center', animation:'up 0.3s ease' }}>
            <div style={{ fontSize:28 }}>💌</div>
            <div style={{ fontFamily:'Fraunces,serif', fontSize:14, color:'#fff', marginTop:8 }}>Thanks for the feedback!</div>
          </div>
        )}
      </div>

      {showReveal && (
        <UnlockReveal
          mascot={mascot}
          newStamps={revealStamps}
          perkEarned={perkEarned}
          spotPerk={spot.perk}
          customerName={profile?.full_name?.split(' ')[0]}
          spotColor={spot.color || C.amber}
          onClose={() => setShowReveal(false)}
        />
      )}
    </div>
  )
}

// ── UNLOCK REVEAL ─────────────────────────────────────────────────────────────
function UnlockReveal({ mascot, newStamps, perkEarned, spotPerk, customerName, spotColor, onClose }) {
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(10,10,20,0.94)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:100, animation:'fadeIn 0.3s ease', borderRadius:44 }}>
      <div style={{ textAlign:'center', maxWidth:300, padding:'0 20px' }}>
        <div style={{ fontSize:10, fontWeight:700, color:C.amber, letterSpacing:'0.15em', textTransform:'uppercase', marginBottom:14, animation:'up 0.4s ease' }}>
          Stamp #{newStamps} added!
        </div>

        <div style={{ animation:'bounce 0.6s ease', filter:`drop-shadow(0 0 30px ${spotColor}66)` }}>
          <Mascot mascot={mascot} stamps={newStamps} size={190} customerName={customerName} />
        </div>

        <div style={{ fontFamily:'Fraunces,serif', fontSize:19, color:'#fff', fontWeight:700, marginTop:8, animation:'up 0.4s ease 0.2s both' }}>
          {mascot.name} {getUnlockLabel(newStamps)}
        </div>

        {perkEarned && (
          <div style={{ marginTop:13, background:'rgba(245,166,35,0.15)', border:`1px solid ${C.amberBrd}`, borderRadius:13, padding:'12px 16px', animation:'up 0.4s ease 0.35s both' }}>
            <div style={{ fontSize:13, color:C.amber, fontWeight:600 }}>🎁 {spotPerk} earned!</div>
          </div>
        )}

        <button onClick={onClose} style={{ marginTop:20, background:C.amber, border:'none', borderRadius:20, padding:'11px 30px', fontSize:14, fontWeight:600, color:C.bg, cursor:'pointer', animation:'up 0.4s ease 0.45s both' }}>
          Nice!
        </button>
      </div>
    </div>
  )
}

// ── PERKS ─────────────────────────────────────────────────────────────────────
function Perks({ onSpot }) {
  const { cards, loading } = useMyCards()
  const { pending, redeemed, loading: perksLoading, redeem } = useMyPerks()
  const [confirming, setConfirming] = useState(null)  // perk pending confirmation
  const [showing,    setShowing]    = useState(null)  // perk being shown to staff
  const [err,        setErr]        = useState('')

  async function doRedeem(perk) {
    const { error } = await redeem(perk.id)
    setConfirming(null)
    if (error) { setErr(error.message); setTimeout(()=>setErr(''), 3000); return }
    setShowing(perk)
  }

  const busy = loading || perksLoading

  return (
    <div style={{ height:'100%', overflowY:'auto', background:C.bg }}>
      <div style={{ padding:'20px 16px 4px' }}>
        <TownPill>Your Progress</TownPill>
        <h2 style={{ fontFamily:'Fraunces,serif', fontSize:24, color:'#fff', marginTop:6 }}>Local <span style={{ color:C.amber, fontStyle:'italic' }}>Perks</span></h2>
      </div>

      <div style={{ display:'flex', gap:8, padding:'12px 16px' }}>
        {[
          [cards.reduce((s,c)=>s+(c.lifetime||0),0), 'Visits'],
          [cards.reduce((s,c)=>s+(c.stamps||0),0),   'Stamps'],
          [pending.length,                            'Ready'],
        ].map(([v,l])=>(
          <div key={l} style={{ flex:1, background:C.card, border:`1px solid ${l==='Ready'&&pending.length>0 ? C.amber : C.border}`, borderRadius:12, padding:'12px 8px', textAlign:'center' }}>
            <div style={{ fontFamily:'Fraunces,serif', fontSize:20, color:C.amber, fontWeight:700 }}>{v}</div>
            <div style={{ fontSize:10, color:'#666' }}>{l}</div>
          </div>
        ))}
      </div>

      {err && (
        <div style={{ margin:'0 16px 10px', background:'rgba(232,149,109,0.12)', border:'1px solid rgba(232,149,109,0.4)', borderRadius:10, padding:'10px 13px', fontSize:12.5, color:'#E8956D' }}>
          {err}
        </div>
      )}

      {busy ? <div style={{ textAlign:'center', padding:'40px', color:C.dim }}>Loading…</div> : (
        <>
          {/* Earned, not yet collected */}
          {pending.length > 0 && (
            <>
              <div style={{ padding:'14px 16px 8px' }}><Label>🎁 Ready to claim</Label></div>
              {pending.map(p=>(
                <div key={p.id} style={{ background:'linear-gradient(135deg,rgba(245,166,35,0.13),rgba(232,149,109,0.06))', border:'1px solid rgba(245,166,35,0.45)', borderRadius:14, padding:'13px 14px', margin:'0 16px 9px', display:'flex', alignItems:'center', gap:12 }}>
                  <span style={{ fontSize:26 }}>{p.spots?.emoji}</span>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontFamily:'Fraunces,serif', fontSize:13.5, color:'#fff' }}>{p.spots?.name}</div>
                    <div style={{ fontSize:12, color:C.amber, fontWeight:500 }}>🎁 {p.reward_text}</div>
                    <div style={{ fontSize:10.5, color:'#666', marginTop:2 }}>
                      Earned {new Date(p.earned_at).toLocaleDateString()}
                    </div>
                  </div>
                  <button onClick={()=>setConfirming(p)} style={{ background:C.amber, color:C.bg, fontSize:11.5, fontWeight:700, padding:'7px 13px', borderRadius:20, border:'none', cursor:'pointer', flexShrink:0 }}>
                    Redeem
                  </button>
                </div>
              ))}
            </>
          )}

          {/* Cards still filling up */}
          {cards.length > 0 && (
            <>
              <div style={{ padding:'14px 16px 8px' }}><Label>In progress</Label></div>
              {cards.map(c=>(
                <div key={c.id} onClick={()=>onSpot(c.spot_id)} style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:14, padding:'12px 14px', margin:'0 16px 9px', display:'flex', alignItems:'center', gap:12, cursor:'pointer' }}>
                  <span style={{ fontSize:24 }}>{c.spots?.emoji}</span>
                  <div style={{ flex:1 }}>
                    <div style={{ fontFamily:'Fraunces,serif', fontSize:13, color:'#fff' }}>{c.spots?.name}</div>
                    <div style={{ background:C.card2, borderRadius:20, height:4, overflow:'hidden', marginTop:6 }}>
                      <div style={{ width:`${((c.stamps||0)/(c.spots?.stamps_required||8))*100}%`, height:'100%', background:`linear-gradient(90deg,${c.spots?.color||C.amber},${C.amber})`, borderRadius:20 }}/>
                    </div>
                  </div>
                  <span style={{ fontSize:11, color:'#444' }}>{c.stamps||0}/{c.spots?.stamps_required||8}</span>
                </div>
              ))}
            </>
          )}

          {/* Already collected */}
          {redeemed.length > 0 && (
            <>
              <div style={{ padding:'14px 16px 8px' }}><Label>Collected</Label></div>
              {redeemed.slice(0,10).map(p=>(
                <div key={p.id} style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:14, padding:'11px 14px', margin:'0 16px 9px', display:'flex', alignItems:'center', gap:12, opacity:0.55 }}>
                  <span style={{ fontSize:20 }}>{p.spots?.emoji}</span>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:12.5, color:'#aaa' }}>{p.reward_text}</div>
                    <div style={{ fontSize:10.5, color:'#555' }}>{p.spots?.name} · {new Date(p.redeemed_at).toLocaleDateString()}</div>
                  </div>
                  <span style={{ fontSize:13, color:C.sage }}>✓</span>
                </div>
              ))}
            </>
          )}

          {cards.length === 0 && pending.length === 0 && (
            <div style={{ textAlign:'center', padding:'48px 24px' }}>
              <div style={{ fontSize:36, marginBottom:12 }}>✦</div>
              <div style={{ fontFamily:'Fraunces,serif', fontSize:18, color:'#fff', marginBottom:6 }}>No stamps yet</div>
              <div style={{ fontSize:13, color:'#555' }}>Tap the sticker at a local spot's counter to start earning.</div>
            </div>
          )}
        </>
      )}

      <div style={{ height:100 }}/>

      {/* Confirm — guards against burning a perk from the couch */}
      {confirming && (
        <div style={{ position:'absolute', inset:0, background:'rgba(0,0,0,0.75)', display:'flex', alignItems:'center', justifyContent:'center', padding:'0 26px', zIndex:60 }}>
          <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:18, padding:'24px 22px', textAlign:'center', maxWidth:320, animation:'up 0.25s ease' }}>
            <div style={{ fontSize:32, marginBottom:10 }}>✋</div>
            <div style={{ fontFamily:'Fraunces,serif', fontSize:17, color:'#fff', fontWeight:700, marginBottom:7 }}>Are you at the counter?</div>
            <div style={{ fontSize:13, color:'#888', lineHeight:1.6, marginBottom:18 }}>
              Only redeem <strong style={{ color:C.amber }}>{confirming.reward_text}</strong> when staff can see your screen. This uses it up and can't be undone.
            </div>
            <div style={{ display:'flex', gap:9 }}>
              <button onClick={()=>setConfirming(null)} style={{ flex:1, background:'none', border:`1px solid ${C.border}`, borderRadius:11, padding:'11px', fontSize:13, color:'#aaa', cursor:'pointer' }}>
                Not yet
              </button>
              <button onClick={()=>doRedeem(confirming)} style={{ flex:1, background:C.amber, border:'none', borderRadius:11, padding:'11px', fontSize:13, fontWeight:600, color:C.bg, cursor:'pointer' }}>
                Redeem it
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Show to staff */}
      {showing && (
        <div style={{ position:'absolute', inset:0, background:'linear-gradient(160deg,#2A1F42,#13131F)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'0 26px', zIndex:60, textAlign:'center' }}>
          <div style={{ fontSize:46, marginBottom:14, animation:'pop 0.5s ease' }}>🎁</div>
          <div style={{ fontSize:12, color:C.amber, fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:8 }}>Show this to staff</div>
          <div style={{ fontFamily:'Fraunces,serif', fontSize:24, color:'#fff', fontWeight:700, marginBottom:5 }}>{showing.reward_text}</div>
          <div style={{ fontSize:13, color:'#888', marginBottom:26 }}>at {showing.spots?.name}</div>

          <div style={{ background:'rgba(245,166,35,0.12)', border:`2px solid ${C.amber}`, borderRadius:16, padding:'16px 32px', marginBottom:28 }}>
            <div style={{ fontSize:10, color:C.amber, letterSpacing:'0.14em', marginBottom:4 }}>CODE</div>
            <div style={{ fontFamily:'monospace', fontSize:34, color:'#fff', fontWeight:700, letterSpacing:'0.14em' }}>{showing.code}</div>
          </div>

          <button onClick={()=>setShowing(null)} style={{ background:'rgba(255,255,255,0.1)', border:'none', borderRadius:12, padding:'12px 30px', fontSize:14, color:'#fff', cursor:'pointer' }}>
            Done
          </button>
        </div>
      )}
    </div>
  )
}

// ── BLOCK ─────────────────────────────────────────────────────────────────────
function Block({ townId, town }) {
  const { feed, loading } = useBlockFeed(townId)
  const tc = { visit:C.amber, offer:'#E8956D', new:'#7BA05B' }
  const tl = { visit:'STAMP EARNED', offer:'DEAL ALERT', new:'NEW SPOT' }

  return (
    <div style={{ height:'100%', overflowY:'auto', background:C.bg }}>
      <div style={{ padding:'20px 16px 4px' }}>
        <TownPill>{town?.name || 'Your town'}</TownPill>
        <h2 style={{ fontFamily:'Fraunces,serif', fontSize:24, color:'#fff', marginTop:6 }}>Main <span style={{ color:'#7BA05B', fontStyle:'italic' }}>Street</span></h2>
        <p style={{ fontSize:12, color:'#555', marginTop:4 }}>What's happening in your town</p>
      </div>
      <div style={{ padding:'14px 16px 100px' }}>
        {loading ? <div style={{ textAlign:'center', padding:'40px', color:C.dim }}>Loading…</div>
        : feed.length === 0 ? (
          <div style={{ textAlign:'center', padding:'48px 24px' }}>
            <div style={{ fontSize:36, marginBottom:12 }}>🏘️</div>
            <div style={{ fontFamily:'Fraunces,serif', fontSize:18, color:'#fff', marginBottom:6 }}>Quiet on Main Street</div>
            <div style={{ fontSize:13, color:'#555' }}>Activity from local spots will appear here as people visit and businesses send offers.</div>
          </div>
        ) : feed.map((item,i)=>(
          <div key={item.id} style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:14, padding:'12px 14px', marginBottom:9, display:'flex', gap:11, alignItems:'flex-start', animation:'up 0.3s ease', animationDelay:`${i*0.06}s`, animationFillMode:'both' }}>
            <div style={{ width:40, height:40, background:`${tc[item.type]||C.amber}18`, border:`1px solid ${tc[item.type]||C.amber}44`, borderRadius:11, display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0 }}>{item.emoji}</div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:9, fontWeight:700, color:tc[item.type]||C.amber, letterSpacing:'0.1em', marginBottom:2 }}>{tl[item.type]||'UPDATE'}</div>
              <div style={{ fontFamily:'Fraunces,serif', fontSize:13, color:'#fff', marginBottom:1 }}>{item.name}</div>
              <div style={{ fontSize:11, color:'#666' }}>{item.text}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── PROFILE ───────────────────────────────────────────────────────────────────
function Profile({ onSwitch, onNav }) {
  const { profile, signOut } = useAuth()
  const [shareMsg, setShareMsg] = useState('')
  const founder = useFounderStatus()
  const spotsLeft = Math.max(0, 50 - founder.claimed)

  async function handleInvite() {
    const shareUrl = window.location.origin
    const shareData = {
      title: 'Homespot',
      text: `Join me on Homespot — earn perks at our local spots in ${profile?.towns?.name || 'town'}!`,
      url: shareUrl,
    }
    try {
      if (navigator.share) {
        await navigator.share(shareData)
      } else {
        await navigator.clipboard.writeText(shareUrl)
        setShareMsg('Link copied!')
        setTimeout(() => setShareMsg(''), 2000)
      }
    } catch (e) {
      // user cancelled the share sheet — nothing to do
    }
  }

  const items = [
    ['My Spot Cards','🗂', () => onNav('perks','perks')],
    ['Main Street','🏘️', () => onNav('block','block')],
    ['Invite Friends','💌', handleInvite],
  ]

  return (
    <div style={{ height:'100%', overflowY:'auto', background:C.bg }}>
      <div style={{ background:'linear-gradient(160deg,#2A1F42,#13131F 60%)', padding:'24px 16px 28px', textAlign:'center' }}>
        <div style={{
          width:64, height:64, borderRadius:'50%',
          background:`linear-gradient(135deg,${C.amber},#E8956D)`,
          display:'flex', alignItems:'center', justifyContent:'center', fontSize:28, margin:'0 auto 12px',
          boxShadow: founder.isFounder ? '0 0 0 3px #13131F, 0 0 0 5px #F5C542, 0 0 22px rgba(245,197,66,0.5)' : 'none',
        }}>
          {profile?.avatar||'🧑'}
        </div>
        <div style={{ fontFamily:'Fraunces,serif', fontSize:18, color:'#fff', fontWeight:600 }}>{profile?.full_name||'Homespotter'}</div>

        {founder.isFounder ? (
          <div style={{ display:'inline-flex', alignItems:'center', gap:6, marginTop:8, background:'linear-gradient(135deg,rgba(245,197,66,0.18),rgba(245,166,35,0.12))', border:'1px solid rgba(245,197,66,0.45)', borderRadius:20, padding:'5px 13px' }}>
            <span style={{ fontSize:13 }}>⭐</span>
            <span style={{ fontSize:11.5, fontWeight:700, color:'#F5C542', letterSpacing:'0.04em' }}>FOUNDING MEMBER</span>
            {founder.rank != null && <span style={{ fontSize:10, color:'rgba(245,197,66,0.6)' }}>#{founder.rank}</span>}
          </div>
        ) : (
          <div style={{ fontSize:12, color:C.amber, marginTop:4 }}>Homespotter{profile?.towns?.name ? ` · ${profile.towns.name}` : ''}</div>
        )}

        <div style={{ marginTop:10 }}>
          <button onClick={onSwitch} style={{ background:C.amberDim, border:`1px solid ${C.amberBrd}`, borderRadius:20, padding:'5px 14px', fontSize:11, color:C.amber, cursor:'pointer', fontWeight:600 }}>📍 Switch town</button>
        </div>
      </div>
      <div style={{ padding:'16px 16px 100px' }}>
        {shareMsg && (
          <div style={{ background:'rgba(123,160,91,0.12)', border:`1px solid ${C.sage}40`, borderRadius:10, padding:'10px 14px', fontSize:13, color:C.sage, marginBottom:10, textAlign:'center' }}>
            ✓ {shareMsg}
          </div>
        )}

        {/* Founder status card */}
        {!founder.loading && founder.isFounder && (
          <div style={{ background:'linear-gradient(135deg,rgba(245,197,66,0.12),rgba(245,166,35,0.06))', border:'1px solid rgba(245,197,66,0.35)', borderRadius:14, padding:'15px 16px', marginBottom:12 }}>
            <div style={{ display:'flex', alignItems:'center', gap:9, marginBottom:6 }}>
              <span style={{ fontSize:18 }}>⭐</span>
              <span style={{ fontFamily:'Fraunces,serif', fontSize:15, fontWeight:700, color:'#F5C542' }}>You're a Homespot Founder</span>
            </div>
            <div style={{ fontSize:12.5, color:'rgba(255,255,255,0.6)', lineHeight:1.55 }}>
              You're one of the first 50 people to join Homespot in your town. Thanks for being here early — your founder badge is permanent.
            </div>
          </div>
        )}

        {/* Incentive card for non-founders while spots remain */}
        {!founder.loading && !founder.isFounder && spotsLeft > 0 && (
          <div onClick={handleInvite} style={{ background:C.card, border:'1px dashed rgba(245,197,66,0.4)', borderRadius:14, padding:'15px 16px', marginBottom:12, cursor:'pointer' }}>
            <div style={{ display:'flex', alignItems:'center', gap:9, marginBottom:5 }}>
              <span style={{ fontSize:17 }}>⭐</span>
              <span style={{ fontFamily:'Fraunces,serif', fontSize:14.5, fontWeight:700, color:'#fff' }}>Only {spotsLeft} Founder {spotsLeft === 1 ? 'spot' : 'spots'} left</span>
            </div>
            <div style={{ fontSize:12.5, color:'rgba(255,255,255,0.55)', lineHeight:1.55 }}>
              The first 50 members get a permanent Founder badge. Invite friends to help grow your town →
            </div>
          </div>
        )}

        {items.map(([l,ic,onClick])=>(
          <div key={l} onClick={onClick} style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12, padding:'13px 15px', marginBottom:8, display:'flex', alignItems:'center', gap:12, cursor:'pointer' }}>
            <div style={{ width:34, height:34, borderRadius:9, background:C.card2, display:'flex', alignItems:'center', justifyContent:'center', fontSize:16 }}>{ic}</div>
            <span style={{ fontSize:14, color:'#fff', fontWeight:500 }}>{l}</span>
            <span style={{ color:'#444', fontSize:13, marginLeft:'auto' }}>›</span>
          </div>
        ))}
        <div onClick={signOut} style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12, padding:'13px 15px', display:'flex', alignItems:'center', gap:12, cursor:'pointer' }}>
          <div style={{ width:34, height:34, borderRadius:9, background:C.card2, display:'flex', alignItems:'center', justifyContent:'center', fontSize:16 }}>🚪</div>
          <span style={{ fontSize:14, color:'#fff', fontWeight:500 }}>Sign out</span>
        </div>
      </div>
    </div>
  )
}

// ── NAV ───────────────────────────────────────────────────────────────────────
function Nav({ tab, onTab, onScan }) {
  const tabs = [
    {id:'home',    label:'Home',  icon:'⌂',  sc:'home'},
    {id:'perks',   label:'Perks', icon:'✦',  sc:'perks'},
    {id:'scan',    label:'',      icon:'⬡',  sc:null, center:true},
    {id:'block',   label:'Main St', icon:'🏘️', sc:'block'},
    {id:'profile', label:'You',   icon:'◎',  sc:'profile'},
  ]
  return (
    <div className="hs-bottomnav" style={{ height:70, background:'#0F0F1E', borderTop:`1px solid ${C.border}`, display:'flex', alignItems:'center', justifyContent:'space-around', padding:'0 8px', flexShrink:0 }}>
      {tabs.map(t=>(
        <button key={t.id} onClick={()=>t.center ? onScan() : onTab(t.sc,t.id)} style={{ background:t.center?C.amber:'none', border:'none', cursor:'pointer', display:'flex', flexDirection:'column', alignItems:'center', padding:t.center?0:'8px 10px', borderRadius:t.center?16:11, gap:2, width:t.center?50:'auto', height:t.center?50:'auto', justifyContent:'center', boxShadow:t.center?'0 4px 18px rgba(245,166,35,0.45)':'none' }}>
          <span style={{ fontSize:t.center?20:17, color:t.center?C.bg:tab===t.id?C.amber:'#444', lineHeight:1 }}>{t.icon}</span>
          {!t.center&&<span style={{ fontFamily:'Inter,sans-serif', fontSize:9, color:tab===t.id?C.amber:'#444' }}>{t.label}</span>}
        </button>
      ))}
    </div>
  )
}
