import { useState } from 'react'
import { useAuth } from '../../lib/AuthContext'
import { useSpots, useStamp, useFeedback, useMyCards, useBlockFeed, useTowns } from '../../lib/hooks'
import { supabase } from '../../lib/supabase'
import { getMascot, getUnlockLabel, TOTAL_LAYERS } from '../../lib/mascotEngine'
import Mascot from '../../components/Mascot'

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
  const { profile, signOut, session, updateProfile, signUp, signIn } = useAuth()
  const [screen,      setScreen]      = useState(profile?.town_id ? 'home' : 'townselect')
  const [townId,      setTownId]      = useState(profile?.town_id || null)
  const [townData,    setTownData]    = useState(profile?.towns   || null)
  const [spotId,      setSpotId]      = useState(null)
  const [tab,         setTab]         = useState('home')
  const [cat,         setCat]         = useState('All')
  const [pendingTown, setPendingTown] = useState(null)
  const [authMode,    setAuthMode]    = useState('signup') // 'signup' | 'signin'

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
    if (!t) return
    setTownId(t.id)
    setTownData(t)
    if (session) {
      await updateProfile({ town_id: t.id })
    }
    setScreen('home')
  }

  async function handleSignup(email, password, name) {
    const { error } = await signUp({ email, password, fullName: name, role: 'consumer' })
    if (!error) await finalizeTown(null)
    return error
  }

  async function handleSignIn(email, password) {
    const { error } = await signIn({ email, password })
    if (!error) await finalizeTown(null)
    return error
  }

  function openSpot(id)  { setSpotId(id); setScreen('spot') }
  function goHome()      { setScreen('home'); setTab('home') }
  function nav(s, t)     { setScreen(s); if (t) setTab(t) }

  const noChrome = ['townselect','signup'].includes(screen)

  return (
    <div style={{ minHeight:'100vh', background:'#0A0A18', display:'flex', alignItems:'center', justifyContent:'center', padding:16, fontFamily:'Inter,sans-serif' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,600;0,9..144,700;1,9..144,400&family=Inter:wght@400;500;600&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        ::-webkit-scrollbar{display:none}
        input,textarea{outline:none;font-family:inherit}
        input::placeholder,textarea::placeholder{color:#555}
        button{font-family:inherit;cursor:pointer}
        @keyframes up{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}
        @keyframes pop{0%{transform:scale(0.8);opacity:0}60%{transform:scale(1.06)}100%{transform:scale(1);opacity:1}}
        @keyframes glow{0%,100%{opacity:0.35}50%{opacity:0.8}}
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        @keyframes bounce{0%{transform:scale(0.5) rotate(-8deg);opacity:0}60%{transform:scale(1.1) rotate(3deg)}100%{transform:scale(1) rotate(0);opacity:1}}
      `}</style>

      <div style={{ width:375, height:780, background:C.bg, borderRadius:44, overflow:'hidden', display:'flex', flexDirection:'column', boxShadow:'0 48px 120px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.07)' }}>

        {/* Status bar */}
        {!noChrome && (
          <div style={{ height:44, background:C.bg, display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 20px', flexShrink:0 }}>
            <span style={{ fontSize:11, color:'#fff', opacity:0.5 }}>9:41</span>
            <Logo size={18}/>
            <span onClick={signOut} style={{ fontSize:11, color:C.amber, cursor:'pointer', fontWeight:600 }}>Sign out</span>
          </div>
        )}

        {/* Screens */}
        <div style={{ flex:1, overflow:'hidden' }}>
          {screen==='townselect' && <TownSelect onSelect={selectTown}/>}
          {screen==='signup'     && <SignupScreen town={pendingTown} authMode={authMode} setAuthMode={setAuthMode} onSignup={handleSignup} onSignIn={handleSignIn} onBack={()=>setScreen('townselect')}/>}
          {screen==='home'       && <Home townId={townId} town={townData} cat={cat} setCat={setCat} onSpot={openSpot} onNav={nav}/>}
          {screen==='spot'       && <SpotDetail spotId={spotId} onBack={goHome}/>}
          {screen==='perks'      && <Perks onSpot={openSpot}/>}
          {screen==='block'      && <Block townId={townId} town={townData}/>}
          {screen==='profile'    && <Profile onSwitch={()=>setScreen('townselect')}/>}
        </div>

        {/* Bottom nav */}
        {!noChrome && <Nav tab={tab} onTab={(s,t)=>nav(s,t)}/>}
      </div>
    </div>
  )
}

// ── TOWN SELECT ───────────────────────────────────────────────────────────────
function TownSelect({ onSelect }) {
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

      <div style={{ padding:'6px 16px 32px' }}>
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
    </div>
  )
}

// ── SIGNUP / SIGN IN ──────────────────────────────────────────────────────────
function SignupScreen({ town, authMode, setAuthMode, onSignup, onSignIn, onBack }) {
  const [name,     setName]     = useState('')
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')

  async function handleSubmit() {
    setError('')
    setLoading(true)
    let err
    if (authMode === 'signup') {
      err = await onSignup(email, password, name)
    } else {
      err = await onSignIn(email, password)
    }
    setLoading(false)
    if (err) setError(err.message)
  }

  const ready = authMode === 'signup'
    ? name.trim() && email.includes('@') && password.length >= 6
    : email.includes('@') && password.length >= 6

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
          Homespot never sells your data or shows you ads.
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
function SpotDetail({ spotId, onBack }) {
  const { profile } = useAuth()
  const [spot,    setSpot]    = useState(null)
  const [loading, setLoading] = useState(true)
  const { addStamp, loading: stamping } = useStamp()
  const { submitFeedback } = useFeedback()
  const [showReveal,  setShowReveal]  = useState(false)
  const [revealStamps, setRevealStamps] = useState(0)
  const [perkEarned,  setPerkEarned]  = useState(false)
  const [mood,        setMood]        = useState(null)
  const [note,        setNote]        = useState('')
  const [fbSent,      setFbSent]      = useState(false)

  useState(() => {
    if (!spotId) return
    supabase.from('spots_with_stamps').select('*').eq('id', spotId).single()
      .then(({ data }) => { setSpot(data); setLoading(false) })
  }, [spotId])

  async function handleStamp() {
    if (!spot || stamping) return
    const { perkEarned: earned } = await addStamp(spot.id)
    const newCount = earned ? spot.stamps_required : (spot.my_stamps || 0) + 1
    setSpot(s => ({ ...s, my_stamps: earned ? 0 : newCount })) // card resets after perk, matches useStamp logic
    setRevealStamps(newCount)
    setPerkEarned(earned)
    setShowReveal(true)
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
          <div style={{ fontSize:12, color:'#555', marginBottom:11 }}>At the register? Add a stamp</div>
          <button onClick={handleStamp} disabled={stamping} style={{ background:`linear-gradient(135deg,${C.amber},#E8956D)`, border:'none', borderRadius:20, padding:'13px 28px', fontSize:14, fontWeight:600, color:C.bg, cursor:'pointer', display:'inline-flex', alignItems:'center', gap:9, boxShadow:'0 8px 24px rgba(245,166,35,0.35)' }}>
            <span>⬡</span> {stamping ? 'Adding…' : 'Scan Spot QR'}
          </button>
        </div>

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
  const earned = cards.filter(c => c.stamps === 0 && c.lifetime > 0)
  const prog   = cards.filter(c => !(c.stamps === 0 && c.lifetime > 0))

  return (
    <div style={{ height:'100%', overflowY:'auto', background:C.bg }}>
      <div style={{ padding:'20px 16px 4px' }}>
        <TownPill>Your Progress</TownPill>
        <h2 style={{ fontFamily:'Fraunces,serif', fontSize:24, color:'#fff', marginTop:6 }}>Local <span style={{ color:C.amber, fontStyle:'italic' }}>Perks</span></h2>
      </div>
      <div style={{ display:'flex', gap:8, padding:'12px 16px' }}>
        {[[cards.reduce((s,c)=>s+(c.lifetime||0),0),'Visits'],[cards.reduce((s,c)=>s+(c.stamps||0),0),'Stamps'],[earned.length,'Ready']].map(([v,l])=>(
          <div key={l} style={{ flex:1, background:C.card, border:`1px solid ${C.border}`, borderRadius:12, padding:'12px 8px', textAlign:'center' }}>
            <div style={{ fontFamily:'Fraunces,serif', fontSize:20, color:C.amber, fontWeight:700 }}>{v}</div>
            <div style={{ fontSize:10, color:'#666' }}>{l}</div>
          </div>
        ))}
      </div>

      {loading ? <div style={{ textAlign:'center', padding:'40px', color:C.dim }}>Loading…</div> : cards.length === 0 ? (
        <div style={{ textAlign:'center', padding:'48px 24px' }}>
          <div style={{ fontSize:36, marginBottom:12 }}>✦</div>
          <div style={{ fontFamily:'Fraunces,serif', fontSize:18, color:'#fff', marginBottom:6 }}>No stamps yet</div>
          <div style={{ fontSize:13, color:'#555' }}>Visit a local spot and tap Scan Spot QR at the register to start earning.</div>
        </div>
      ) : <>
        {earned.length > 0 && <>
          <div style={{ padding:'14px 16px 8px' }}><Label>🎁 Ready to redeem</Label></div>
          {earned.map(c=>(
            <div key={c.id} onClick={()=>onSpot(c.spot_id)} style={{ background:C.card, border:'1px solid rgba(245,166,35,0.3)', borderRadius:14, padding:'12px 14px', margin:'0 16px 9px', display:'flex', alignItems:'center', gap:12, cursor:'pointer' }}>
              <span style={{ fontSize:24 }}>{c.spots?.emoji}</span>
              <div style={{ flex:1 }}>
                <div style={{ fontFamily:'Fraunces,serif', fontSize:13, color:'#fff' }}>{c.spots?.name}</div>
                <div style={{ fontSize:11, color:C.amber }}>🎁 {c.spots?.perk}</div>
              </div>
              <div style={{ background:C.amber, color:C.bg, fontSize:11, fontWeight:700, padding:'5px 11px', borderRadius:20 }}>Redeem</div>
            </div>
          ))}
        </>}
        {prog.length > 0 && <>
          <div style={{ padding:'14px 16px 8px' }}><Label>In progress</Label></div>
          {prog.map(c=>(
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
        </>}
      </>}
      <div style={{ height:100 }}/>
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
        <h2 style={{ fontFamily:'Fraunces,serif', fontSize:24, color:'#fff', marginTop:6 }}>The <span style={{ color:'#7BA05B', fontStyle:'italic' }}>Block</span></h2>
        <p style={{ fontSize:12, color:'#555', marginTop:4 }}>What's happening in your town</p>
      </div>
      <div style={{ padding:'14px 16px 100px' }}>
        {loading ? <div style={{ textAlign:'center', padding:'40px', color:C.dim }}>Loading…</div>
        : feed.length === 0 ? (
          <div style={{ textAlign:'center', padding:'48px 24px' }}>
            <div style={{ fontSize:36, marginBottom:12 }}>📣</div>
            <div style={{ fontFamily:'Fraunces,serif', fontSize:18, color:'#fff', marginBottom:6 }}>Nothing yet</div>
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
function Profile({ onSwitch }) {
  const { profile, signOut } = useAuth()
  return (
    <div style={{ height:'100%', overflowY:'auto', background:C.bg }}>
      <div style={{ background:'linear-gradient(160deg,#2A1F42,#13131F 60%)', padding:'24px 16px 28px', textAlign:'center' }}>
        <div style={{ width:64, height:64, borderRadius:'50%', background:`linear-gradient(135deg,${C.amber},#E8956D)`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:28, margin:'0 auto 12px' }}>
          {profile?.avatar||'🧑'}
        </div>
        <div style={{ fontFamily:'Fraunces,serif', fontSize:18, color:'#fff', fontWeight:600 }}>{profile?.full_name||'Homespotter'}</div>
        <div style={{ fontSize:12, color:C.amber, marginTop:4 }}>Homespotter</div>
        <button onClick={onSwitch} style={{ marginTop:10, background:C.amberDim, border:`1px solid ${C.amberBrd}`, borderRadius:20, padding:'5px 14px', fontSize:11, color:C.amber, cursor:'pointer', fontWeight:600 }}>📍 Switch town</button>
      </div>
      <div style={{ padding:'16px 16px 100px' }}>
        {[['My Spot Cards','🗂'],['Visit History','📋'],['Notifications','🔔'],['Invite Friends','💌']].map(([l,ic])=>(
          <div key={l} style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12, padding:'13px 15px', marginBottom:8, display:'flex', alignItems:'center', gap:12, cursor:'pointer' }}>
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
function Nav({ tab, onTab }) {
  const tabs = [
    {id:'home',    label:'Home',  icon:'⌂',  sc:'home'},
    {id:'perks',   label:'Perks', icon:'✦',  sc:'perks'},
    {id:'scan',    label:'',      icon:'⬡',  sc:null, center:true},
    {id:'block',   label:'Block', icon:'📣', sc:'block'},
    {id:'profile', label:'You',   icon:'◎',  sc:'profile'},
  ]
  return (
    <div style={{ height:70, background:'#0F0F1E', borderTop:`1px solid ${C.border}`, display:'flex', alignItems:'center', justifyContent:'space-around', padding:'0 8px', flexShrink:0 }}>
      {tabs.map(t=>(
        <button key={t.id} onClick={()=>!t.center&&onTab(t.sc,t.id)} style={{ background:t.center?C.amber:'none', border:'none', cursor:'pointer', display:'flex', flexDirection:'column', alignItems:'center', padding:t.center?0:'8px 10px', borderRadius:t.center?16:11, gap:2, width:t.center?50:'auto', height:t.center?50:'auto', justifyContent:'center', boxShadow:t.center?'0 4px 18px rgba(245,166,35,0.45)':'none' }}>
          <span style={{ fontSize:t.center?20:17, color:t.center?C.bg:tab===t.id?C.amber:'#444', lineHeight:1 }}>{t.icon}</span>
          {!t.center&&<span style={{ fontFamily:'Inter,sans-serif', fontSize:9, color:tab===t.id?C.amber:'#444' }}>{t.label}</span>}
        </button>
      ))}
    </div>
  )
}
