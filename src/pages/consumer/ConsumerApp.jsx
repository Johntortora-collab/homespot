import { useState, useEffect, useRef, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../../lib/AuthContext'
import { useSpots, useStamp, useFeedback, useMyCards, useTowns, useTownRequest, useFounderStatus, useMyPerks, useClaimOffer } from '../../lib/hooks'
import { supabase } from '../../lib/supabase'
import QRScanner from '../../components/QRScanner'
import NotificationToggle from '../../components/NotificationToggle'
import SpotsMap from '../../components/SpotsMap'

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

// Business photos are optional — plenty of spots will never upload one, and a
// broken-image icon looks worse than no image at all. Every photo render goes
// through this so the emoji fallback is consistent everywhere.
// Counts are the point: "Restaurant 9" tells you what the town is made of
// before you tap anything, which is exactly what a directory should do.
function Chip({ label, count, active, onClick }) {
  return (
    <button onClick={onClick}
      style={{
        display:'inline-flex', alignItems:'center', gap:6,
        background: active ? C.amber : C.card2,
        color: active ? C.bg : '#aaa',
        fontFamily:'Inter,sans-serif', fontSize:11, fontWeight: active ? 600 : 400,
        padding:'5px 11px 5px 13px', borderRadius:20, border:'none',
        cursor:'pointer', whiteSpace:'nowrap', flexShrink:0,
      }}>
      {label}
      <span style={{
        fontSize:9.5, fontWeight:600,
        background: active ? 'rgba(19,19,31,0.18)' : 'rgba(255,255,255,0.07)',
        color: active ? C.bg : '#777',
        borderRadius:9, padding:'1px 5px', minWidth:15, textAlign:'center',
      }}>{count}</span>
    </button>
  )
}

function SpotPhoto({ spot, height, radius = 0, children }) {
  const [failed, setFailed] = useState(false)
  const show = spot?.photo_url && !failed

  return (
    <div style={{ position:'relative', width:'100%', height, borderRadius:radius, overflow:'hidden', background:`linear-gradient(150deg,${spot?.color||C.amber}22,${C.card2})`, flexShrink:0 }}>
      {show ? (
        <img
          src={spot.photo_url}
          alt={spot.name || ''}
          loading="lazy"
          onError={()=>setFailed(true)}
          style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }}
        />
      ) : (
        <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:height*0.42 }}>
          {spot?.emoji || '🏪'}
        </div>
      )}
      {children}
    </div>
  )
}

// Everything a customer needs to actually go there. Address, phone and hours
// have been collected from owners all along and never shown to anyone — for a
// directory that's the whole point of the page, so they lead now.
//
// Every row is a real link: tel: dials, a maps query opens whatever map app
// they use, and the website opens in a new tab. Plain text you have to copy
// out by hand is a dead end on a phone.
// "about 2 km away" beats "1,983m away" when you're deciding whether to walk.
function formatDistance(m) {
  if (m < 1000) return `${Math.round(m / 10) * 10} m away`
  return `${(m / 1000).toFixed(1)} km away`
}

function SpotInfo({ spot }) {
  const site = normaliseWebsite(spot.website)
  const rows = []

  if (spot.address) rows.push({
    icon: '📍',
    label: spot.address,
    sub: 'Get directions',
    href: `https://maps.google.com/?q=${encodeURIComponent(`${spot.name} ${spot.address}`)}`,
    external: true,
  })
  if (spot.hours) rows.push({ icon: '🕒', label: spot.hours, wrap: true })
  if (spot.phone) rows.push({
    icon: '📞', label: spot.phone, sub: 'Tap to call',
    href: `tel:${spot.phone.replace(/[^\d+]/g, '')}`,
  })
  if (site) rows.push({ icon: '🔗', label: site.label, href: site.href, external: true })

  if (rows.length === 0) return null

  return (
    <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:18, overflow:'hidden', marginBottom:16 }}>
      {rows.map((r, i) => {
        const inner = (
          <>
            <span style={{ fontSize:15, width:20, flexShrink:0, textAlign:'center' }}>{r.icon}</span>
            <span style={{ flex:1, minWidth:0 }}>
              <span style={{ display:'block', fontSize:13, color:'#fff', lineHeight:1.45,
                ...(r.wrap ? {} : { overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }) }}>
                {r.label}
              </span>
              {r.sub && <span style={{ display:'block', fontSize:10.5, color:C.dim, marginTop:2 }}>{r.sub}</span>}
            </span>
            {r.href && <span style={{ fontSize:11, color:'#444', flexShrink:0 }}>›</span>}
          </>
        )
        const style = {
          display:'flex', alignItems:'center', gap:11, padding:'13px 15px',
          borderTop: i === 0 ? 'none' : `1px solid ${C.border}`,
          textDecoration:'none', color:'inherit',
        }
        return r.href
          ? <a key={i} href={r.href} style={style}
              {...(r.external ? { target:'_blank', rel:'noopener noreferrer nofollow' } : {})}>{inner}</a>
          : <div key={i} style={style}>{inner}</div>
      })}
    </div>
  )
}

function Label({ children }) {
  return <div style={{ fontFamily:'Inter,sans-serif', fontSize:10, fontWeight:600, color:'#555', letterSpacing:'0.1em', textTransform:'uppercase' }}>{children}</div>
}

// ── Root ──────────────────────────────────────────────────────────────────────
export default function ConsumerApp() {
  const { profile, signOut, session, updateProfile, signUp, signIn, loading: authLoading } = useAuth()
  const { spotId: urlSpotId } = useParams() // present when loaded via /scan/:spotId deep link
  const navigate = useNavigate()
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
    <div className="hs-shell" style={{ background:'#0A0A18', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'Inter,sans-serif' }}>
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
        .hs-shell { padding:16px; min-height:100vh; min-height:100dvh; }
        .hs-phone {
          width:375px; height:780px; max-height:92vh;
          border-radius:44px;
          box-shadow:0 48px 120px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.07);
        }

        /* Real phones / narrow viewports: fill the whole screen, no frame chrome.
           The frame is PINNED to the viewport rather than sized in vh units.
           100vh on a mobile browser measures the screen WITHOUT the URL bar, so
           a container sized that way is taller than what you can actually see —
           the page itself scrolls and carries the bottom nav up with it. Fixing
           the shell to the viewport means only the inner screen ever scrolls. */
        @media (max-width: 520px) {
          html, body {
            height:100%;
            overflow:hidden;
            overscroll-behavior:none;   /* stops the iOS rubber-band page drag */
          }
          .hs-shell {
            padding:0;
            position:fixed;
            inset:0;
            min-height:0;
            height:100%;
          }
          .hs-phone {
            position:absolute;
            inset:0;
            width:100%;
            height:100%;
            max-height:none;
            border-radius:0;
            box-shadow:none;
          }
          .hs-statusbar { display:none; }
          .hs-bottomnav { padding-bottom:max(8px, env(safe-area-inset-bottom)) !important; height:calc(70px + env(safe-area-inset-bottom)) !important; }
        }
      `}</style>

      <div className="hs-phone" style={{ background:C.bg, overflow:'hidden', display:'flex', flexDirection:'column', position:'relative' }}>

        {/* Status bar (desktop preview only — real phones already show their own) */}
        {!noChrome && (
          <div className="hs-statusbar" style={{ height:44, background:C.bg, display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 20px', flexShrink:0 }}>
            {/* The hardcoded "9:41" that used to sit here was mockup dressing —
                a frozen fake clock that looked broken to anyone who noticed it. */}
            <span style={{ width:18 }} />
            <Logo size={18}/>
            {/* sign-out removed — to be rebuilt */}
          </div>
        )}

        {/* Screens — the ONLY scrolling region on mobile. minHeight:0 is what
            lets a flex child actually shrink and scroll instead of growing to
            fit its content and pushing the nav off-screen. */}
        <div style={{ flex:1, minHeight:0, overflow:'hidden', WebkitOverflowScrolling:'touch' }}>
          {screen==='townselect' && <TownSelect onSelect={selectTown} onRequestTown={handleRequestTownClick}/>}
          {screen==='signup'     && <SignupScreen town={pendingTown} authMode={authMode} setAuthMode={setAuthMode} onSignup={handleSignup} onSignIn={handleSignIn} onBack={()=>{ setRequestTownAfterAuth(false); setScreen('townselect') }}/>}
          {screen==='requesttown' && <RequestTownScreen onBack={()=>setScreen(townId ? 'home' : 'townselect')} onSubmitted={()=>setScreen(townId ? 'home' : 'townselect')}/>}
          {screen==='home'       && <MainStreet townId={townId} town={townData} cat={cat} setCat={setCat} onSpot={openSpot} onNav={nav}/>}
          {screen==='spot'       && <SpotDetail spotId={spotId} onBack={goHome} autoStamp={autoStamp} onAutoStampDone={()=>setAutoStamp(false)}/>}
          {screen==='perks'      && <MySpots onSpot={openSpot}/>}
          {screen==='surprise'   && <Surprise townId={townId} town={townData} onSpot={openSpot}/>}
          {screen==='profile'    && <Profile onSwitch={()=>setScreen('townselect')} onNav={nav}/>}
          {screen==='account'    && <AccountScreen onBack={()=>setScreen('profile')}/>}
        </div>

        {/* Owners browse the consumer app like anyone else — this is their way back
            to the dashboard. Sits inside .hs-phone so it tracks the desktop frame
            instead of floating against the viewport. */}
        {!noChrome && profile?.role === 'owner' && (
          <button
            onClick={()=>navigate('/owner/dashboard')}
            style={{
              position:'absolute', right:14, bottom:84, zIndex:60,
              background:'rgba(30,30,48,0.94)', border:`1px solid ${C.amberBrd}`,
              borderRadius:20, padding:'8px 14px', fontSize:12, fontWeight:600,
              color:C.amber, display:'flex', alignItems:'center', gap:7,
              boxShadow:'0 6px 20px rgba(0,0,0,0.5)', cursor:'pointer',
            }}>
            <span style={{ fontSize:13 }}>🏪</span> My business →
          </button>
        )}

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
  const [resetSent, setResetSent] = useState(false)
  const [resetBusy, setResetBusy] = useState(false)

  // Sends a Supabase recovery email. The link inside it lands on /reset-password,
  // which is registered in App.jsx above the role checks.
  async function handleForgotPassword() {
    setError('')
    if (!email.includes('@')) {
      setError('Enter your email address above first, then tap this again.')
      return
    }
    setResetBusy(true)
    const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    setResetBusy(false)
    if (err) { setError(err.message); return }
    setResetSent(true)
  }

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

  if (resetSent) return (
    <div style={{ height:'100%', overflowY:'auto', background:C.bg, display:'flex', alignItems:'center', justifyContent:'center', padding:'0 24px' }}>
      <div style={{ textAlign:'center', maxWidth:300, animation:'up 0.4s ease' }}>
        <div style={{ fontSize:48, marginBottom:18 }}>🔑</div>
        <h2 style={{ fontFamily:'Fraunces,serif', fontSize:22, color:'#fff', fontWeight:700, marginBottom:10 }}>Check your email</h2>
        <p style={{ fontSize:13, color:'#888', lineHeight:1.6, marginBottom:6 }}>
          If an account exists for
        </p>
        <p style={{ fontSize:14, color:C.amber, fontWeight:600, marginBottom:18 }}>{email}</p>
        <p style={{ fontSize:13, color:'#666', lineHeight:1.6, marginBottom:24 }}>
          we've sent a link to reset your password. It expires shortly, so use it soon.
        </p>
        <button onClick={()=>{ setResetSent(false); setPassword('') }} style={{ background:C.amber, border:'none', borderRadius:13, padding:'12px 28px', fontSize:14, fontWeight:600, color:C.bg, cursor:'pointer' }}>
          Back to sign in
        </button>
      </div>
    </div>
  )

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
          {authMode === 'signin' && (
            <button onClick={handleForgotPassword} disabled={resetBusy}
              style={{ alignSelf:'flex-end', background:'none', border:'none', padding:'4px 0 0', fontSize:12, color:'#888', textDecoration:'underline', cursor:resetBusy?'default':'pointer' }}>
              {resetBusy ? 'Sending…' : 'Forgot password?'}
            </button>
          )}
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
function MainStreet({ townId, town, cat, setCat, onSpot, onNav }) {
  const { spots, loading } = useSpots(townId)
  // Built from what's actually in the town, not a guessed list. The old
  // hardcoded chips included 'Food', 'Books' and 'Gifts' — none of which are
  // real category values (they're 'Restaurant', 'Bookshop', 'Boutique'), so
  // three of the six filters silently returned nothing.
  //
  // Deriving them means a chip can never point at an empty result, the counts
  // are honest, and adding a category to onboarding needs no change here.
  const cats = useMemo(() => {
    const counts = new Map()
    spots.forEach(s => {
      const c = s.category?.trim()
      if (c) counts.set(c, (counts.get(c) || 0) + 1)
    })
    return [...counts.entries()]
      // Busiest first — in a town that's mostly restaurants, burying
      // "Restaurant" under alphabetical order helps nobody.
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([name, n]) => ({ name, n }))
  }, [spots])
  const [q, setQ] = useState('')
  const [view, setView] = useState('list')   // list | map
  const [showBanner, setShowBanner] = useState(true)

  // Directory, not a feed: every active business in the town, narrowed by
  // category chip and/or a name search. Both filters apply together.
  const needle = q.trim().toLowerCase()
  const filtered = spots
    .filter(s => cat === 'All' || s.category === cat)
    .filter(s => !needle
      || s.name?.toLowerCase().includes(needle)
      || s.tagline?.toLowerCase().includes(needle)
      || s.category?.toLowerCase().includes(needle))
  const withOffers = spots.filter(s => s.latest_offer)

  useEffect(() => {
    if (cat !== 'All' && !loading && !cats.some(c => c.name === cat)) setCat('All')
  }, [cat, cats, loading, setCat])

  return (
    // Column flex so the map can claim the leftover height. In map view the
    // page itself must NOT scroll — a scrolling container swallows the drag
    // gestures the map needs, and panning ends up moving the page instead.
    <div style={{ height:'100%', background:C.bg, display:'flex', flexDirection:'column', overflowY: view === 'map' ? 'hidden' : 'auto' }}>
      <div style={{ background:'linear-gradient(160deg,#211540,#13131F 58%)', padding:'18px 18px 24px', position:'relative', overflow:'hidden', flexShrink:0 }}>
        <div style={{ position:'absolute', inset:0, backgroundImage:'radial-gradient(circle,rgba(245,166,35,0.13) 1px,transparent 1px)', backgroundSize:'18px 18px', zIndex:1 }}/>
        <div style={{ position:'relative', zIndex:2 }}>
          <TownPill>📍 {town?.name || 'Your town'}, {town?.state || ''}</TownPill>
          <h1 style={{ fontFamily:'Fraunces,serif', fontSize:28, color:'#fff', fontWeight:700, lineHeight:1.15, marginBottom:6 }}>
            Main <span style={{ color:C.amber, fontStyle:'italic' }}>Street</span>
          </h1>
          <p style={{ fontSize:12, color:C.dim }}>
            {loading ? 'Loading local businesses…'
              : `${spots.length} ${spots.length === 1 ? 'business' : 'businesses'} on Homespot${town?.name ? ` in ${town.name}` : ''}`}
          </p>
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

      {/* List / Map toggle. Only shown once something is actually on the map —
          an empty map is a worse first impression than no map at all. */}
      {spots.some(s => Number.isFinite(s.lat) && Number.isFinite(s.lng)) && (
        <div style={{ display:'flex', gap:6, padding:'14px 16px 0' }}>
          {[['list','☰  List'],['map','◎  Map']].map(([id,label])=>(
            <button key={id} onClick={()=>setView(id)}
              style={{ flex:1, background: view===id ? C.amberDim : C.card, border:`1px solid ${view===id ? C.amberBrd : C.border}`, borderRadius:11, padding:'9px', fontSize:12.5, fontWeight:600, color: view===id ? C.amber : '#888', cursor:'pointer', fontFamily:'inherit' }}>
              {label}
            </button>
          ))}
        </div>
      )}

      {view === 'map' ? (
        <div style={{ flex:1, minHeight:0, padding:'12px 16px 16px' }}>
          <div style={{ height:'100%', borderRadius:16, overflow:'hidden', border:`1px solid ${C.border}` }}>
            <SpotsMap spots={filtered} town={town} onSpot={onSpot} />
          </div>
        </div>
      ) : (
      <>

      {/* Search only earns its space once there's a roster worth searching. */}
      {spots.length >= 8 && (
        <div style={{ padding:'16px 16px 0' }}>
          <div style={{ display:'flex', alignItems:'center', gap:9, background:C.card, border:`1px solid ${C.border}`, borderRadius:12, padding:'10px 13px' }}>
            <span style={{ fontSize:13, color:'#555' }}>⌕</span>
            <input
              value={q}
              onChange={e=>setQ(e.target.value)}
              placeholder="Search businesses"
              style={{ flex:1, background:'none', border:'none', color:'#fff', fontSize:13.5 }}
            />
            {q && <button onClick={()=>setQ('')} style={{ background:'none', border:'none', color:'#555', fontSize:14, padding:0 }}>✕</button>}
          </div>
        </div>
      )}

      {/* One category isn't a filter, it's a label — hide the row entirely
          rather than showing a chip that can only ever do nothing. */}
      {cats.length > 1 && (
        <div style={{ display:'flex', gap:8, padding:'16px 16px 0', overflowX:'auto' }}>
          <Chip label="All" count={spots.length} active={cat==='All'} onClick={()=>setCat('All')} />
          {cats.map(c=>(
            <Chip key={c.name} label={c.name} count={c.n} active={cat===c.name} onClick={()=>setCat(c.name)} />
          ))}
        </div>
      )}

      <div style={{ padding:'12px 16px 100px' }}>
        {loading ? (
          <div style={{ textAlign:'center', padding:'40px', color:C.dim }}>Loading spots…</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign:'center', padding:'48px 24px' }}>
            <div style={{ fontSize:36, marginBottom:12 }}>🏪</div>
            {spots.length === 0 ? (
              <>
                <div style={{ fontFamily:'Fraunces,serif', fontSize:18, color:'#fff', marginBottom:6 }}>No businesses yet</div>
                <div style={{ fontSize:13, color:'#555', lineHeight:1.6 }}>Businesses in {town?.name} haven't joined Homespot yet. Share it with your favourite local spots!</div>
              </>
            ) : (
              <>
                <div style={{ fontFamily:'Fraunces,serif', fontSize:18, color:'#fff', marginBottom:6 }}>Nothing matches</div>
                <div style={{ fontSize:13, color:'#555', lineHeight:1.6 }}>
                  No {cat !== 'All' ? `${cat.toLowerCase()} ` : ''}businesses{needle ? ` for “${q.trim()}”` : ''}. Try a different search or category.
                </div>
              </>
            )}
          </div>
        ) : filtered.map((s,i) => (
          <div key={s.id} onClick={()=>onSpot(s.id)} style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:14, padding:10, marginBottom:9, display:'flex', gap:11, alignItems:'center', cursor:'pointer', animation:'up 0.3s ease', animationDelay:`${i*0.05}s`, animationFillMode:'both' }}>
            <div style={{ width:58, flexShrink:0 }}>
              <SpotPhoto spot={s} height={58} radius={11}/>
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontFamily:'Fraunces,serif', fontSize:14, color:'#fff', fontWeight:600, marginBottom:2 }}>{s.name}</div>
              <div style={{ fontSize:11, color:'#555', marginBottom:6, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{s.tagline}</div>
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

      </>
      )}
    </div>
  )
}


// Owners type "beanandbarrel.com" as often as they type the full URL, so accept
// both. Anything that isn't http/https is rejected outright — a javascript: or
// data: URL in this field would otherwise run when a customer taps the link.
function normaliseWebsite(raw) {
  if (!raw) return null
  const trimmed = String(raw).trim()
  if (!trimmed) return null
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
  try {
    const u = new URL(withScheme)
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null
    if (!u.hostname.includes('.')) return null
    return {
      href: u.href,
      label: (u.hostname.replace(/^www\./, '') + (u.pathname === '/' ? '' : u.pathname)).replace(/\/$/, ''),
    }
  } catch {
    return null
  }
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
  const { claimOffer, claiming } = useClaimOffer()
  const [offerClaimed, setOfferClaimed] = useState(false)
  const [offerErr,     setOfferErr]     = useState('')

  // Claiming writes a redemption row. The DB has a unique index on
  // (user_id, offer_id), so a second claim is rejected at the database level —
  // not just hidden in the UI.
  async function handleClaimOffer() {
    if (!spot?.latest_offer_id) return
    setOfferErr('')
    const { error } = await claimOffer({
      offerId: spot.latest_offer_id,
      spotId:  spot.id,
      message: spot.latest_offer,
    })
    if (error) { setOfferErr(error.message); return }
    setOfferClaimed(true)
  }

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
  const [stampBlocked, setStampBlocked] = useState(null)
  useEffect(() => {
    if (!autoStamp || !spot || autoStampFired.current) return
    autoStampFired.current = true
    applyStamp().finally(onAutoStampDone)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStamp, spot])

  async function applyStamp() {
    if (!spot || stamping) return
    const { perkEarned: earned, alreadyScanned, reason, distanceM } = await addStamp(spot.id)

    if (alreadyScanned) {
      setShowAlreadyScanned(true)
      setTimeout(() => setShowAlreadyScanned(false), 2600)
      return
    }

    // A refusal has to SAY something. Someone standing at a counter with a
    // phone that did nothing will assume the app is broken and stop using it —
    // so every rejection reason gets its own plain-language message.
    if (reason) {
      setStampBlocked(
        reason === 'need_location'
          ? { title:'Location needed',
              body:"Homespot checks you're actually at the business before adding a stamp. Turn on location for this site and scan again." }
        : reason === 'too_far'
          ? { title:"You're not there yet",
              body:`This looks like it's about ${distanceM ? formatDistance(distanceM) : 'a way'} from ${spot.name}. Stamps only count at the counter.` }
        : reason === 'own_spot'
          ? { title:'That\'s your own spot',
              body:"You can't collect stamps at a business registered to your account." }
        : { title:'Couldn\'t add that stamp',
            body:'Something went wrong. Try scanning again in a moment.' }
      )
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
  const site = normaliseWebsite(spot.website)

  async function handleFeedback() {
    if (mood === null) return
    await submitFeedback({ spotId: spot.id, mood: mood+1, note })
    setFbSent(true)
  }

  return (
    <div style={{ height:'100%', overflowY:'auto', background:C.bg, position:'relative' }}>
      {/* Photo hero, when there is one. The back button floats over it; the
          gradient at the bottom keeps the name legible against a bright photo. */}
      {spot.photo_url && (
        <div style={{ position:'relative' }}>
          <SpotPhoto spot={spot} height={190}/>
          <div style={{ position:'absolute', inset:0, background:'linear-gradient(180deg, rgba(19,19,31,0.55) 0%, rgba(19,19,31,0) 38%, rgba(19,19,31,0.92) 100%)' }}/>
          <button onClick={onBack} style={{ position:'absolute', top:14, left:16, background:'rgba(0,0,0,0.45)', backdropFilter:'blur(6px)', border:'none', color:'#fff', fontFamily:'Inter,sans-serif', fontSize:12, padding:'7px 13px', borderRadius:20, cursor:'pointer' }}>← Spots</button>
        </div>
      )}

      <div style={{ background:`linear-gradient(160deg,${spot.color||C.amber}28,#13131F 62%)`, padding: spot.photo_url ? '0 16px 22px' : '14px 16px 22px', marginTop: spot.photo_url ? -34 : 0, position:'relative' }}>
        {!spot.photo_url && (
          <button onClick={onBack} style={{ background:'rgba(255,255,255,0.08)', border:'none', color:'#fff', fontFamily:'Inter,sans-serif', fontSize:12, padding:'6px 12px', borderRadius:20, cursor:'pointer', marginBottom:8 }}>← Spots</button>
        )}
        <div style={{ textAlign:'center', paddingTop:4 }}>
          {!spot.photo_url && <div style={{ fontSize:48, marginBottom:8 }}>{spot.emoji}</div>}
          <h2 style={{ fontFamily:'Fraunces,serif', fontSize:22, color:'#fff', fontWeight:700, marginBottom:3 }}>{spot.name}</h2>
          <div style={{ fontSize:11, color:'#aaa' }}>{spot.tagline}</div>
          {/* Category as a quiet subtitle; the website has moved into the
              info card below with the rest of the practical details. */}
          {spot.category && (
            <div style={{ display:'inline-block', marginTop:9, background:'rgba(255,255,255,0.07)', border:`1px solid ${C.border}`, borderRadius:20, padding:'4px 12px', fontSize:10.5, color:'#bbb' }}>
              {spot.category}
            </div>
          )}
        </div>
      </div>

      <div style={{ padding:'0 16px 100px' }}>
        {spot.latest_offer && (
          <div style={{ background:'rgba(245,166,35,0.08)', border:`1px solid ${C.amberBrd}`, borderRadius:11, padding:'12px 13px', marginBottom:13, marginTop:6 }}>
            <div style={{ display:'flex', gap:9, marginBottom: offerClaimed || spot.latest_offer_id ? 10 : 0 }}>
              <span>🔥</span>
              <span style={{ fontFamily:'Inter,sans-serif', fontSize:12.5, color:C.amber, flex:1, lineHeight:1.45 }}>{spot.latest_offer}</span>
            </div>

            {offerClaimed ? (
              <div style={{ display:'flex', alignItems:'center', gap:7, fontSize:12, color:C.sage, fontWeight:500 }}>
                <span>✓</span> Claimed — find it under Perks
              </div>
            ) : offerErr ? (
              <div style={{ fontSize:12, color:'#E8956D' }}>{offerErr}</div>
            ) : spot.latest_offer_id ? (
              <button
                onClick={handleClaimOffer}
                disabled={claiming}
                style={{ width:'100%', background:C.amber, border:'none', borderRadius:9, padding:'9px', fontSize:12.5, fontWeight:700, color:C.bg, cursor:'pointer' }}
              >
                {claiming ? 'Claiming…' : 'Grab this deal →'}
              </button>
            ) : null}
          </div>
        )}

        {/* Stamp card */}
        <SpotInfo spot={spot} />

        {(() => {
          const remaining = Math.max(0, spot.stamps_required - myStamps)
          const complete  = myStamps >= spot.stamps_required
          const accent    = spot.color || C.amber
          return (
        <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:18, padding:'20px 16px 16px', marginBottom:16 }}>

          {/* Big count centerpiece */}
          <div style={{ textAlign:'center', marginBottom:14 }}>
            <div style={{ fontFamily:'Fraunces,serif', fontWeight:700, color:'#fff', lineHeight:1, display:'flex', alignItems:'baseline', justifyContent:'center', gap:6 }}>
              <span style={{ fontSize:52 }}>{myStamps}</span>
              <span style={{ fontSize:22, color:C.dim }}>of {spot.stamps_required}</span>
            </div>
            <div style={{ fontSize:12.5, color: complete ? C.sage : '#888', marginTop:6, fontWeight:600 }}>
              {complete
                ? '🎉 Reward ready — show this at the counter'
                : myStamps === 0
                  ? 'Scan at the counter to collect your first stamp'
                  : `${remaining} more check-in${remaining === 1 ? '' : 's'} to earn your reward`}
            </div>
          </div>

          {/* Stamp circles */}
          <div style={{ display:'flex', flexWrap:'wrap', gap:8, justifyContent:'center', marginBottom:14 }}>
            {Array.from({length:spot.stamps_required}).map((_,i)=>{
              const filled = i < myStamps
              return (
                <div key={i} style={{
                  width:30, height:30, borderRadius:'50%',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  fontSize:14, fontWeight:700,
                  background: filled ? accent : 'transparent',
                  color: filled ? C.bg : '#555',
                  border: filled ? `1px solid ${accent}` : `1.5px dashed #3a3a4a`,
                }}>
                  {filled ? '✓' : i + 1}
                </div>
              )
            })}
          </div>

          <div style={{ background:C.card2, borderRadius:20, height:4, overflow:'hidden', marginBottom:8 }}>
            <div style={{ width:`${Math.min(100,(myStamps/spot.stamps_required)*100)}%`, height:'100%', background:`linear-gradient(90deg,${accent},${C.amber})`, borderRadius:20, transition:'width 0.8s' }}/>
          </div>
          <div style={{ fontSize:11, color:'#555', textAlign:'center' }}>
            {complete ? `Earned: ${spot.perk}` : `Reward: ${spot.perk}`}
          </div>
        </div>
          )
        })()}

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
          {/* Given room to explain rather than a one-line toast: these are the
              cases where a customer needs to DO something (allow location, walk
              over), and a message that vanishes in two seconds doesn't help. */}
          {stampBlocked && (
            <div style={{ marginTop:12, background:'rgba(232,149,109,0.1)', border:'1px solid rgba(232,149,109,0.35)', borderRadius:14, padding:'13px 15px', textAlign:'left', animation:'up 0.3s ease' }}>
              <div style={{ fontFamily:'Fraunces,serif', fontSize:14, color:'#E8956D', fontWeight:700, marginBottom:5 }}>
                {stampBlocked.title}
              </div>
              <div style={{ fontSize:12, color:C.dim, lineHeight:1.55 }}>{stampBlocked.body}</div>
              <button onClick={()=>setStampBlocked(null)}
                style={{ background:'none', border:'none', color:'#666', fontSize:11.5, cursor:'pointer', marginTop:9, padding:0, fontFamily:'inherit' }}>
                Dismiss
              </button>
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
          newStamps={revealStamps}
          totalStamps={spot.stamps_required}
          perkEarned={perkEarned}
          spotPerk={spot.perk}
          spotColor={spot.color || C.amber}
          onClose={() => setShowReveal(false)}
        />
      )}
    </div>
  )
}

// ── UNLOCK REVEAL ─────────────────────────────────────────────────────────────
function UnlockReveal({ newStamps, totalStamps, perkEarned, spotPerk, spotColor, onClose }) {
  const complete  = perkEarned || (totalStamps && newStamps >= totalStamps)
  const remaining = Math.max(0, (totalStamps || 0) - newStamps)
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(10,10,20,0.94)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:100, animation:'fadeIn 0.3s ease', borderRadius:44 }}>
      <div style={{ textAlign:'center', maxWidth:300, padding:'0 20px' }}>
        <div style={{ fontSize:10, fontWeight:700, color:C.amber, letterSpacing:'0.15em', textTransform:'uppercase', marginBottom:18, animation:'up 0.4s ease' }}>
          {complete ? 'Card complete!' : 'Check-in added!'}
        </div>

        {/* Stamp badge */}
        <div style={{ animation:'bounce 0.6s ease', filter:`drop-shadow(0 0 30px ${spotColor}66)`, display:'flex', justifyContent:'center' }}>
          <div style={{
            width:130, height:130, borderRadius:'50%',
            background:`linear-gradient(135deg,${spotColor},${C.amber})`,
            display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
            color:C.bg,
          }}>
            <div style={{ fontFamily:'Fraunces,serif', fontSize:44, fontWeight:700, lineHeight:1 }}>
              {complete ? '★' : newStamps}
            </div>
            {!complete && totalStamps && (
              <div style={{ fontSize:13, fontWeight:700, opacity:0.75, marginTop:2 }}>of {totalStamps}</div>
            )}
          </div>
        </div>

        <div style={{ fontFamily:'Fraunces,serif', fontSize:19, color:'#fff', fontWeight:700, marginTop:16, animation:'up 0.4s ease 0.2s both' }}>
          {complete
            ? 'Reward unlocked!'
            : remaining === 0
              ? 'All stamps collected!'
              : `${remaining} more to go`}
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
function MySpots({ onSpot }) {
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
        <h2 style={{ fontFamily:'Fraunces,serif', fontSize:24, color:'#fff', marginTop:6 }}>My <span style={{ color:C.amber, fontStyle:'italic' }}>Spots</span></h2>
        <p style={{ fontSize:12, color:'#555', marginTop:4 }}>
          {cards.length > 0
            ? `${cards.length} ${cards.length === 1 ? 'place' : 'places'} you've checked into`
            : 'Places you check into show up here'}
        </p>
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

          {/* Every business this person has checked into. useMyCards already
              sorts by lifetime visits, so the top of this list is their
              regulars — that ordering IS the "frequent" part of My Spots. */}
          {cards.length > 0 && (
            <>
              <div style={{ padding:'14px 16px 8px' }}><Label>Where you go</Label></div>
              {cards.map(c=>(
                <div key={c.id} onClick={()=>onSpot(c.spot_id)} style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:14, padding:'12px 14px', margin:'0 16px 9px', display:'flex', alignItems:'center', gap:12, cursor:'pointer' }}>
                  <span style={{ fontSize:24 }}>{c.spots?.emoji}</span>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:7 }}>
                      <div style={{ fontFamily:'Fraunces,serif', fontSize:13, color:'#fff' }}>{c.spots?.name}</div>
                      {(c.lifetime||0) >= 5 && (
                        <span style={{ background:C.amberDim, border:`1px solid ${C.amberBrd}`, color:C.amber, fontSize:8, fontWeight:700, letterSpacing:'0.08em', padding:'2px 6px', borderRadius:6, flexShrink:0 }}>REGULAR</span>
                      )}
                    </div>
                    <div style={{ fontSize:10.5, color:'#555', marginTop:2 }}>
                      {c.lifetime||0} {(c.lifetime||0) === 1 ? 'visit' : 'visits'}
                    </div>
                    <div style={{ background:C.card2, borderRadius:20, height:4, overflow:'hidden', marginTop:6 }}>
                      <div style={{ width:`${((c.stamps||0)/(c.spots?.stamps_required||8))*100}%`, height:'100%', background:`linear-gradient(90deg,${c.spots?.color||C.amber},${C.amber})`, borderRadius:20 }}/>
                    </div>
                  </div>
                  <span style={{ fontSize:11, color:'#444', flexShrink:0 }}>{c.stamps||0}/{c.spots?.stamps_required||8}</span>
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
              <div style={{ fontFamily:'Fraunces,serif', fontSize:18, color:'#fff', marginBottom:6 }}>No spots yet</div>
              <div style={{ fontSize:13, color:'#555', lineHeight:1.6 }}>Tap the sticker at a local spot's counter to start earning. Browse Main Street to see who's on Homespot near you.</div>
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

// ── ACCOUNT & SECURITY ────────────────────────────────────────────────────────
function AccountScreen({ onBack }) {
  const { session, updateEmail, updatePassword, authProvider } = useAuth()
  const isGoogle = authProvider === 'google'

  const [email,  setEmail]  = useState('')
  const [curPw,  setCurPw]  = useState('')
  const [newPw,  setNewPw]  = useState('')
  const [confPw, setConfPw] = useState('')
  const [busy,   setBusy]   = useState(null)
  const [msg,    setMsg]    = useState(null)

  const inputStyle = {
    width:'100%', background:C.card, border:`1px solid ${C.border}`,
    borderRadius:11, padding:'12px 13px', fontSize:14, color:'#fff',
  }

  function flash(kind, text) {
    setMsg({ kind, text })
    setTimeout(()=>setMsg(null), 5000)
  }

  async function handleEmail() {
    const next = email.trim()
    if (!next || !next.includes('@')) return flash('err', 'Enter a valid email address.')
    if (next === session?.user?.email)  return flash('err', "That's already your email.")
    setBusy('email')
    const { error } = await updateEmail(next)
    setBusy(null)
    if (error) return flash('err', error.message)
    setEmail('')
    flash('ok', `Check ${next} for a confirmation link. Your current email keeps working until you click it.`)
  }

  async function handlePassword() {
    if (newPw.length < 8) return flash('err', 'New password must be at least 8 characters.')
    if (newPw !== confPw) return flash('err', "New passwords don't match.")
    if (!curPw)           return flash('err', 'Enter your current password.')
    setBusy('password')
    const { error } = await updatePassword({ currentPassword: curPw, newPassword: newPw })
    setBusy(null)
    if (error) return flash('err', error.message)
    setCurPw(''); setNewPw(''); setConfPw('')
    flash('ok', 'Password updated.')
  }

  return (
    <div style={{ height:'100%', overflowY:'auto', background:C.bg }}>
      <div style={{ padding:'20px 16px 8px' }}>
        <button onClick={onBack} style={{ background:'rgba(255,255,255,0.08)', border:'none', color:'#fff', fontSize:12, padding:'6px 12px', borderRadius:20, cursor:'pointer', marginBottom:12 }}>← Back</button>
        <h2 style={{ fontFamily:'Fraunces,serif', fontSize:22, color:'#fff', fontWeight:700 }}>Account &amp; <span style={{ color:C.amber, fontStyle:'italic' }}>Security</span></h2>
        <p style={{ fontSize:12, color:'#666', marginTop:5 }}>
          Signed in as <span style={{ color:'#aaa' }}>{session?.user?.email}</span>
          {isGoogle && <span style={{ marginLeft:6, fontSize:10, background:C.card, border:`1px solid ${C.border}`, borderRadius:20, padding:'2px 7px', color:'#888' }}>via Google</span>}
        </p>
      </div>

      <div style={{ padding:'12px 16px 100px' }}>
        {msg && (
          <div style={{
            background: msg.kind==='ok' ? 'rgba(123,160,91,0.13)' : 'rgba(232,149,109,0.13)',
            border: `1px solid ${msg.kind==='ok' ? 'rgba(123,160,91,0.45)' : 'rgba(232,149,109,0.45)'}`,
            borderRadius:11, padding:'11px 13px', fontSize:12.5, lineHeight:1.55,
            color: msg.kind==='ok' ? C.sage : '#E8956D', marginBottom:14,
          }}>
            {msg.kind==='ok' ? '✓ ' : '⚠ '}{msg.text}
          </div>
        )}

        {isGoogle ? (
          <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:14, padding:'16px', fontSize:13, color:'#888', lineHeight:1.65 }}>
            You sign in with Google, so your email and password live there — Homespot never sees them.
            To change either, update your Google account.
          </div>
        ) : (
          <>
            <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:14, padding:'16px', marginBottom:12 }}>
              <div style={{ fontFamily:'Fraunces,serif', fontSize:14, color:'#fff', marginBottom:10 }}>Change email</div>
              <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="new@email.com" style={inputStyle}/>
              <div style={{ fontSize:11, color:'#666', margin:'7px 0 11px', lineHeight:1.5 }}>
                We'll send a confirmation link to the new address. Nothing changes until you click it.
              </div>
              <button onClick={handleEmail} disabled={busy==='email'} style={{ width:'100%', background:C.amber, border:'none', borderRadius:11, padding:'12px', fontSize:13.5, fontWeight:600, color:C.bg, cursor:'pointer' }}>
                {busy==='email' ? 'Sending…' : 'Update email'}
              </button>
            </div>

            <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:14, padding:'16px' }}>
              <div style={{ fontFamily:'Fraunces,serif', fontSize:14, color:'#fff', marginBottom:10 }}>Change password</div>
              <div style={{ display:'flex', flexDirection:'column', gap:9 }}>
                <input type="password" value={curPw} onChange={e=>setCurPw(e.target.value)} placeholder="Current password" autoComplete="current-password" style={inputStyle}/>
                <input type="password" value={newPw} onChange={e=>setNewPw(e.target.value)} placeholder="New password (8+ characters)" autoComplete="new-password" style={inputStyle}/>
                <input type="password" value={confPw} onChange={e=>setConfPw(e.target.value)} placeholder="Confirm new password" autoComplete="new-password"
                  style={{ ...inputStyle, border:`1px solid ${confPw && newPw !== confPw ? 'rgba(232,149,109,0.6)' : C.border}` }}/>
                <button onClick={handlePassword} disabled={busy==='password'} style={{ background:C.amber, border:'none', borderRadius:11, padding:'12px', fontSize:13.5, fontWeight:600, color:C.bg, cursor:'pointer', marginTop:2 }}>
                  {busy==='password' ? 'Updating…' : 'Update password'}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ── SURPRISE ME ───────────────────────────────────────────────────────────────
//
// "We don't know what to do today." Two buttons, one random business.
//
// Owners choose their own bucket during onboarding (spots.spot_type), so this
// is no longer a guess from the category. 'both' appears in either list; 'none'
// appears in neither — a dry cleaner belongs on Main Street but isn't an answer
// to "what should we do today."
//
// Falls back to the old category guess only for rows predating the column, so
// a spot never silently vanishes from the picker.
const EAT_CATEGORIES = ['Food', 'Coffee', 'Bakery', 'Dessert', 'Bar', 'Restaurant', 'Cafe']

function inBucket(spot, bucket) {
  const t = spot.spot_type
  if (t) return t === bucket || t === 'both'
  return (EAT_CATEGORIES.includes(spot.category) ? 'eat' : 'do') === bucket
}

// Remembering the last few picks is what stops a five-restaurant town from
// serving the same pizza place three spins running, which reads as broken
// rather than random.
const RECENT_KEY = 'hs_surprise_recent'
const RECENT_MAX = 4

function readRecent() {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY)) || [] } catch { return [] }
}
function pushRecent(id) {
  try {
    const next = [id, ...readRecent().filter(x => x !== id)].slice(0, RECENT_MAX)
    localStorage.setItem(RECENT_KEY, JSON.stringify(next))
  } catch {}
}

function Surprise({ townId, town, onSpot }) {
  const { spots, loading } = useSpots(townId)
  const [mode,   setMode]   = useState(null)   // null | 'eat' | 'do'
  const [pick,   setPick]   = useState(null)
  const [rolling, setRolling] = useState(false)

  const pools = {
    eat: spots.filter(s => inBucket(s, 'eat')),
    do:  spots.filter(s => inBucket(s, 'do')),
  }

  function roll(which) {
    const pool = pools[which]
    if (pool.length === 0) { setMode(which); setPick(null); return }

    // Exclude recent picks — unless that would leave nothing, in which case a
    // repeat beats an empty screen.
    const recent = readRecent()
    const fresh  = pool.filter(s => !recent.includes(s.id))
    const from   = fresh.length > 0 ? fresh : pool.filter(s => s.id !== pick?.id)
    const finalPool = from.length > 0 ? from : pool

    const chosen = finalPool[Math.floor(Math.random() * finalPool.length)]

    setMode(which)
    setRolling(true)
    // Short, honest beat. A long spin animation oversells a draw from a pool
    // of six and makes the reveal feel like a slot machine that owes you.
    setTimeout(() => {
      setPick(chosen)
      pushRecent(chosen.id)
      setRolling(false)
    }, 450)
  }

  function reset() { setMode(null); setPick(null) }

  return (
    <div style={{ height:'100%', overflowY:'auto', background:C.bg }}>
      <div style={{ padding:'20px 16px 4px' }}>
        <TownPill>{town?.name || 'Your town'}</TownPill>
        <h2 style={{ fontFamily:'Fraunces,serif', fontSize:24, color:'#fff', marginTop:6 }}>
          Surprise <span style={{ color:'#7BA05B', fontStyle:'italic' }}>me</span>
        </h2>
        <p style={{ fontSize:12, color:'#555', marginTop:4 }}>Can't decide? Let Homespot pick.</p>
      </div>

      <div style={{ padding:'18px 16px 100px' }}>
        {loading ? (
          <div style={{ textAlign:'center', padding:'40px', color:C.dim }}>Loading…</div>
        ) : spots.length === 0 ? (
          <div style={{ textAlign:'center', padding:'48px 24px' }}>
            <div style={{ fontSize:36, marginBottom:12 }}>🎲</div>
            <div style={{ fontFamily:'Fraunces,serif', fontSize:18, color:'#fff', marginBottom:6 }}>Nothing to pick from yet</div>
            <div style={{ fontSize:13, color:'#555', lineHeight:1.6 }}>Once businesses in {town?.name || 'your town'} join Homespot, this is where you'll get a suggestion.</div>
          </div>
        ) : (
          <>
            {/* The two choices. Always visible so a second roll is one tap. */}
            <div style={{ display:'flex', gap:11, marginBottom:20 }}>
              {[
                ['eat', '🍽️', 'Somewhere to eat', C.amber],
                ['do',  '🎈', 'Something to do',   '#7BA05B'],
              ].map(([id, icon, label, colour]) => (
                <button
                  key={id}
                  onClick={()=>roll(id)}
                  disabled={rolling}
                  style={{
                    flex:1, background: mode===id ? `${colour}1F` : C.card,
                    border:`1px solid ${mode===id ? colour : C.border}`,
                    borderRadius:16, padding:'18px 12px', cursor:'pointer',
                    display:'flex', flexDirection:'column', alignItems:'center', gap:8,
                    opacity: rolling ? 0.6 : 1, transition:'all 0.2s ease',
                  }}>
                  <span style={{ fontSize:26 }}>{icon}</span>
                  <span style={{ fontFamily:'Fraunces,serif', fontSize:12.5, fontWeight:600, color: mode===id ? colour : '#fff', textAlign:'center', lineHeight:1.3 }}>{label}</span>
                  <span style={{ fontSize:9.5, color:'#555' }}>{pools[id].length} {pools[id].length === 1 ? 'spot' : 'spots'}</span>
                </button>
              ))}
            </div>

            {rolling && (
              <div style={{ textAlign:'center', padding:'32px 24px', color:C.dim, fontSize:13 }}>
                Picking a spot…
              </div>
            )}

            {/* Chose a bucket that has nothing in it yet */}
            {!rolling && mode && !pick && (
              <div style={{ textAlign:'center', padding:'32px 24px' }}>
                <div style={{ fontSize:30, marginBottom:10 }}>🤷</div>
                <div style={{ fontFamily:'Fraunces,serif', fontSize:15.5, color:'#fff', marginBottom:6 }}>
                  No {mode === 'eat' ? 'places to eat' : 'things to do'} yet
                </div>
                <div style={{ fontSize:12.5, color:'#555', lineHeight:1.6 }}>
                  Nothing in {town?.name || 'your town'} fits that yet. Try the other button, or browse Main Street.
                </div>
              </div>
            )}

            {/* The result */}
            {!rolling && pick && (
              <div style={{ animation:'pop 0.35s ease' }}>
                <div style={{ textAlign:'center', marginBottom:12 }}>
                  <Label>{mode === 'eat' ? 'Go eat here' : 'Go check this out'}</Label>
                </div>

                <div style={{ background:'linear-gradient(150deg,#251A45,#1E1E30 62%)', border:`1px solid ${pick.color || C.amber}55`, borderRadius:20, overflow:'hidden' }}>
                  {pick.photo_url && <SpotPhoto spot={pick} height={160}/>}
                  <div style={{ padding:'22px 20px 20px', textAlign:'center' }}>
                    {!pick.photo_url && <div style={{ fontSize:46, marginBottom:12 }}>{pick.emoji}</div>}
                    <div style={{ fontFamily:'Fraunces,serif', fontSize:21, color:'#fff', fontWeight:700, marginBottom:5 }}>{pick.name}</div>
                    {pick.tagline && <div style={{ fontSize:12.5, color:C.dim, lineHeight:1.55, marginBottom:10 }}>{pick.tagline}</div>}

                    <div style={{ display:'inline-flex', alignItems:'center', gap:6, background:C.ghost, borderRadius:20, padding:'4px 11px', fontSize:10.5, color:'#888', marginBottom:6 }}>
                      {pick.category}
                    </div>

                    {pick.latest_offer && (
                      <div style={{ background:C.amberDim, border:`1px solid ${C.amberBrd}`, borderRadius:11, padding:'9px 12px', fontSize:11.5, color:C.amber, marginTop:10, lineHeight:1.45 }}>
                        🔥 {pick.latest_offer}
                      </div>
                    )}

                    <div style={{ display:'flex', gap:9, marginTop:18 }}>
                      <button onClick={()=>roll(mode)} style={{ flex:1, background:'none', border:`1px solid ${C.border}`, borderRadius:12, padding:'12px', fontSize:13, color:'#aaa', cursor:'pointer' }}>
                        Try again
                      </button>
                      <button onClick={()=>onSpot(pick.id)} style={{ flex:1, background:C.amber, border:'none', borderRadius:12, padding:'12px', fontSize:13, fontWeight:600, color:C.bg, cursor:'pointer' }}>
                        Take me there →
                      </button>
                    </div>
                  </div>
                </div>

                <button onClick={reset} style={{ width:'100%', background:'none', border:'none', color:'#444', fontSize:11.5, marginTop:14, cursor:'pointer' }}>
                  Start over
                </button>
              </div>
            )}
          </>
        )}
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
    // An owner can browse and earn stamps like anyone else (e.g. the baker
    // collecting a coffee card across the street) — give them a way back.
    ...(profile?.role === 'owner'
      ? [['My Business Dashboard','🏪', () => { window.location.href = '/owner/dashboard' }]]
      : []),
    ['My Spots','🗂', () => onNav('perks','perks')],
    ['Main Street','🏘️', () => onNav('home','home')],
    ['Surprise Me','🎲', () => onNav('surprise','surprise')],
    ['Invite Friends','💌', handleInvite],
    ['Account & Security','⚙', () => onNav('account','profile')],
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

        <NotificationToggle />

        {items.map(([l,ic,onClick])=>(
          <div key={l} onClick={onClick} style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12, padding:'13px 15px', marginBottom:8, display:'flex', alignItems:'center', gap:12, cursor:'pointer' }}>
            <div style={{ width:34, height:34, borderRadius:9, background:C.card2, display:'flex', alignItems:'center', justifyContent:'center', fontSize:16 }}>{ic}</div>
            <span style={{ fontSize:14, color:'#fff', fontWeight:500 }}>{l}</span>
            <span style={{ color:'#444', fontSize:13, marginLeft:'auto' }}>›</span>
          </div>
        ))}
        <button
          onClick={signOut}
          style={{ width:'100%', background:C.card, border:`1px solid ${C.border}`, borderRadius:12, padding:'13px 15px', marginTop:8, display:'flex', alignItems:'center', gap:12, cursor:'pointer', fontFamily:'inherit', textAlign:'left' }}
        >
          <span style={{ width:34, height:34, borderRadius:9, background:C.card2, display:'flex', alignItems:'center', justifyContent:'center', fontSize:16 }}>🚪</span>
          <span style={{ fontSize:14, color:'#fff', fontWeight:500 }}>Sign out</span>
        </button>
      </div>
    </div>
  )
}

// ── NAV ───────────────────────────────────────────────────────────────────────
function Nav({ tab, onTab, onScan }) {
  const tabs = [
    {id:'home',     label:'Main St',  icon:'🏘️', sc:'home'},
    {id:'perks',    label:'My Spots', icon:'✦',  sc:'perks'},
    {id:'scan',     label:'',         icon:'⬡',  sc:null, center:true},
    {id:'surprise', label:'Surprise', icon:'🎲', sc:'surprise'},
    {id:'profile',  label:'You',      icon:'◎',  sc:'profile'},
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
