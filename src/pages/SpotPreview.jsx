import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'

const C = {
  bg:'#13131F', card:'#1E1E30', card2:'#252538',
  amber:'#F5A623', amberDim:'rgba(245,166,35,0.12)', amberBrd:'rgba(245,166,35,0.3)',
  sage:'#7BA05B', dim:'rgba(255,255,255,0.45)', border:'rgba(255,255,255,0.08)',
}

/**
 * /preview/:spotId — the listing you show an owner across their own counter.
 *
 * Public on purpose: no account needed to look. A draft is a spots row with
 * active = false, so nothing here is visible to customers until claimed.
 *
 * Claiming needs the 6-character code, which never travels in the URL. The
 * link alone must not be enough to take over a business's listing — someone
 * glancing over a shoulder shouldn't be able to.
 */
export default function SpotPreview() {
  const { spotId } = useParams()
  const navigate   = useNavigate()
  const { session, signUp, signIn } = useAuth()

  const [spot,    setSpot]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [stage,   setStage]   = useState('preview')   // preview | claim | done
  const [error,   setError]   = useState('')
  const [busy,    setBusy]    = useState(false)

  const [code,  setCode]  = useState('')
  const [mode,  setMode]  = useState('signup')        // signup | signin
  const [name,  setName]  = useState('')
  const [email, setEmail] = useState('')
  const [pw,    setPw]    = useState('')
  const [needsConfirm, setNeedsConfirm] = useState(false)

  useEffect(() => {
    if (!spotId) return
    supabase.rpc('get_draft_spot', { p_spot_id: spotId }).then(({ data }) => {
      setSpot(data?.[0] || null)
      setLoading(false)
    })
  }, [spotId])

  async function handleClaim() {
    setError('')
    if (code.trim().length < 4) return setError('Enter the code you were given.')
    setBusy(true)

    // Sign in or sign up first when there's no session — claim_spot needs a
    // real authenticated user to hang ownership on.
    if (!session) {
      if (mode === 'signup') {
        const { data, error: err } = await signUp({ email, password: pw, fullName: name, role: 'owner' })
        if (err) { setBusy(false); return setError(err.message) }
        if (!data?.session) {
          // Email confirmation is on. Nothing more can happen until they click
          // the link, so say so rather than failing mysteriously.
          setBusy(false)
          setNeedsConfirm(true)
          return
        }
      } else {
        const { error: err } = await signIn({ email, password: pw })
        if (err) { setBusy(false); return setError(err.message) }
      }
    }

    const { data, error: rpcErr } = await supabase.rpc('claim_spot', {
      p_spot_id: spotId,
      p_code: code.trim(),
    })
    setBusy(false)

    if (rpcErr)      return setError(rpcErr.message)
    if (!data?.ok)   return setError(data?.error || 'Could not claim this listing.')

    setStage('done')
  }

  if (loading) return <Centered>Loading…</Centered>

  if (!spot) return (
    <Centered>
      <div style={{ fontSize:40, marginBottom:14 }}>🔍</div>
      <div style={{ fontFamily:'Fraunces,serif', fontSize:20, color:'#fff', marginBottom:8 }}>Listing not found</div>
      <div style={{ fontSize:13.5, color:C.dim, lineHeight:1.6 }}>
        This preview link may have expired or been removed.
      </div>
    </Centered>
  )

  if (spot.is_claimed && stage !== 'done') return (
    <Centered>
      <div style={{ fontSize:40, marginBottom:14 }}>✓</div>
      <div style={{ fontFamily:'Fraunces,serif', fontSize:20, color:'#fff', marginBottom:8 }}>Already live</div>
      <div style={{ fontSize:13.5, color:C.dim, lineHeight:1.6, marginBottom:20 }}>
        {spot.name} has already been claimed and is on Homespot.
      </div>
      <Button onClick={()=>navigate('/owner/dashboard')}>Go to dashboard</Button>
    </Centered>
  )

  if (stage === 'done') return (
    <Centered>
      <div style={{ fontSize:48, marginBottom:16, animation:'pop 0.5s ease' }}>🎉</div>
      <div style={{ fontFamily:'Fraunces,serif', fontSize:23, color:'#fff', fontWeight:700, marginBottom:10 }}>
        {spot.name} is live!
      </div>
      <div style={{ fontSize:13.5, color:C.dim, lineHeight:1.65, marginBottom:24 }}>
        You're on Main Street in {spot.town_name}. Next: print your Spot QR so customers
        can start collecting stamps.
      </div>
      <Button onClick={()=>navigate('/owner/dashboard')}>Open my dashboard →</Button>
      <Keyframes/>
    </Centered>
  )

  return (
    <div style={{ minHeight:'100vh', background:C.bg, fontFamily:'Inter,sans-serif', padding:'28px 20px 60px' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,600;0,9..144,700;1,9..144,400&family=Inter:wght@400;500;600&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        input{outline:none;font-family:inherit}
        input::placeholder{color:#555}
        @keyframes pop{0%{transform:scale(0.8);opacity:0}60%{transform:scale(1.06)}100%{transform:scale(1);opacity:1}}
        @keyframes up{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}
      `}</style>

      <div style={{ maxWidth:400, margin:'0 auto' }}>
        <div style={{ textAlign:'center', marginBottom:22 }}>
          <div style={{ display:'inline-flex', alignItems:'center', gap:7, marginBottom:14 }}>
            <svg width={22} height={22} viewBox="0 0 32 32" fill="none">
              <circle cx="16" cy="16" r="16" fill={C.amber}/>
              <path d="M16 7L24 14V25H19V19H13V25H8V14Z" fill={C.bg}/>
            </svg>
            <span style={{ fontFamily:'Fraunces,serif', fontSize:17, fontWeight:700, color:'#fff' }}>
              home<span style={{ color:C.amber }}>spot</span>
            </span>
          </div>
          <div style={{ display:'inline-block', background:C.amberDim, border:`1px solid ${C.amberBrd}`, borderRadius:20, padding:'4px 12px', fontSize:10, fontWeight:700, color:C.amber, letterSpacing:'0.1em', textTransform:'uppercase' }}>
            Preview · not live yet
          </div>
          <h1 style={{ fontFamily:'Fraunces,serif', fontSize:24, color:'#fff', fontWeight:700, marginTop:14, lineHeight:1.25 }}>
            Here's how <span style={{ color:C.amber, fontStyle:'italic' }}>{spot.name}</span> would look on Homespot
          </h1>
          <p style={{ fontSize:13, color:C.dim, marginTop:8, lineHeight:1.6 }}>
            Free for local businesses in {spot.town_name}{spot.town_state ? `, ${spot.town_state}` : ''}.
          </p>
        </div>

        {/* The listing itself, rendered as customers would see it */}
        <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:20, overflow:'hidden', marginBottom:18, animation:'up 0.4s ease' }}>
          {spot.photo_url ? (
            <img src={spot.photo_url} alt={spot.name} style={{ width:'100%', height:165, objectFit:'cover', display:'block' }}/>
          ) : (
            <div style={{ height:130, background:`linear-gradient(150deg,${spot.color||C.amber}22,${C.card2})`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:52 }}>
              {spot.emoji}
            </div>
          )}

          <div style={{ padding:'18px 18px 20px' }}>
            <div style={{ fontFamily:'Fraunces,serif', fontSize:19, color:'#fff', fontWeight:700 }}>{spot.name}</div>
            {spot.tagline && <div style={{ fontSize:12.5, color:C.dim, marginTop:3 }}>{spot.tagline}</div>}

            {/* The practical details, shown the way a customer would see them.
                An owner checks their own hours and phone number first — a wrong
                one is the fastest way to lose confidence in the whole thing. */}
            <div style={{ marginTop:10, display:'flex', flexDirection:'column', gap:5 }}>
              {spot.address && <InfoLine icon="📍">{spot.address}</InfoLine>}
              {spot.hours   && <InfoLine icon="🕒">{spot.hours}</InfoLine>}
              {spot.phone   && <InfoLine icon="📞">{spot.phone}</InfoLine>}
              {spot.website && <InfoLine icon="🔗">{spot.website}</InfoLine>}
            </div>

            <div style={{ height:1, background:C.border, margin:'16px 0' }}/>

            <div style={{ fontSize:10, fontWeight:700, color:'#555', letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:9 }}>
              Your Spot Card
            </div>
            <div style={{ display:'flex', gap:5, flexWrap:'wrap', marginBottom:10 }}>
              {Array.from({ length: spot.stamps_required || 8 }).map((_, i) => (
                <div key={i} style={{ width:13, height:13, borderRadius:'50%', background: i < 3 ? (spot.color||C.amber) : C.card2, border:`1px solid ${i < 3 ? (spot.color||C.amber) : '#33334A'}` }}/>
              ))}
            </div>
            <div style={{ fontSize:12.5, color:C.dim, lineHeight:1.55 }}>
              {spot.stamps_required || 8} visits earns <strong style={{ color:C.amber }}>{spot.perk}</strong>
            </div>
          </div>
        </div>

        {/* What they actually get */}
        <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:16, padding:'16px 18px', marginBottom:18 }}>
          <div style={{ fontSize:12.5, fontWeight:600, color:'#fff', marginBottom:11 }}>What you get, free:</div>
          {[
            ['🗂', 'A digital loyalty card — no punch cards to reprint'],
            ['🔔', 'Send an offer that reaches your regulars\' phones'],
            ['📊', 'See who your repeat customers are, and who\'s gone quiet'],
            ['🏘️', 'A listing on Main Street where neighbours are already looking'],
          ].map(([icon, text]) => (
            <div key={text} style={{ display:'flex', gap:10, alignItems:'flex-start', marginBottom:9 }}>
              <span style={{ fontSize:14, flexShrink:0 }}>{icon}</span>
              <span style={{ fontSize:12.5, color:C.dim, lineHeight:1.55 }}>{text}</span>
            </div>
          ))}
        </div>

        {stage === 'preview' ? (
          <>
            <Button onClick={()=>setStage('claim')} full>✦ Go Live — it's free</Button>
            <p style={{ fontSize:11.5, color:'#555', textAlign:'center', marginTop:12, lineHeight:1.6 }}>
              Nothing is visible to customers until you tap this. You can edit or pause anytime.
            </p>
          </>
        ) : needsConfirm ? (
          <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:16, padding:'20px 18px', textAlign:'center' }}>
            <div style={{ fontSize:32, marginBottom:12 }}>📬</div>
            <div style={{ fontFamily:'Fraunces,serif', fontSize:17, color:'#fff', fontWeight:700, marginBottom:8 }}>Check your email</div>
            <div style={{ fontSize:13, color:C.dim, lineHeight:1.6 }}>
              We sent a confirmation link to <strong style={{ color:'#fff' }}>{email}</strong>. Click it,
              then come back to this page and enter your code to finish.
            </div>
          </div>
        ) : (
          <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:16, padding:'20px 18px', animation:'up 0.3s ease' }}>
            <div style={{ fontFamily:'Fraunces,serif', fontSize:17, color:'#fff', fontWeight:700, marginBottom:6 }}>
              Let's get you set up
            </div>
            <div style={{ fontSize:12.5, color:C.dim, lineHeight:1.6, marginBottom:16 }}>
              {session
                ? 'Enter the code you were given to claim this listing.'
                : 'Create your owner account, then enter your code.'}
            </div>

            <div style={{ display:'flex', flexDirection:'column', gap:11 }}>
              {!session && (
                <>
                  <div style={{ display:'flex', gap:7, marginBottom:2 }}>
                    {[['signup','New account'],['signin','I have one']].map(([id,label])=>(
                      <button key={id} onClick={()=>{setMode(id); setError('')}}
                        style={{ flex:1, background: mode===id ? C.amberDim : 'none', border:`1px solid ${mode===id ? C.amberBrd : C.border}`, borderRadius:10, padding:'8px', fontSize:12, fontWeight:600, color: mode===id ? C.amber : '#777', cursor:'pointer' }}>
                        {label}
                      </button>
                    ))}
                  </div>

                  {mode === 'signup' && (
                    <Input value={name} onChange={setName} placeholder="Your name"/>
                  )}
                  <Input value={email} onChange={setEmail} placeholder="Email" type="email"/>
                  <Input value={pw} onChange={setPw} placeholder={mode==='signup' ? 'Password (8+ characters)' : 'Password'} type="password"/>
                </>
              )}

              <Input
                value={code}
                onChange={v=>setCode(v.toUpperCase())}
                placeholder="Your 6-character code"
                style={{ letterSpacing:'0.18em', textTransform:'uppercase', fontFamily:'monospace', fontSize:16 }}
              />

              {error && (
                <div style={{ background:'rgba(232,149,109,0.1)', border:'1px solid rgba(232,149,109,0.35)', borderRadius:10, padding:'10px 12px', fontSize:12.5, color:'#E8956D', lineHeight:1.5 }}>
                  {error}
                </div>
              )}

              <Button onClick={handleClaim} full disabled={busy}>
                {busy ? 'Setting up…' : 'Claim this listing →'}
              </Button>

              <button onClick={()=>{setStage('preview'); setError('')}}
                style={{ background:'none', border:'none', color:'#555', fontSize:12, cursor:'pointer', marginTop:2 }}>
                ← Back to preview
              </button>
            </div>
          </div>
        )}
      </div>
      <Keyframes/>
    </div>
  )
}

function InfoLine({ icon, children }) {
  return (
    <div style={{ display:'flex', gap:8, alignItems:'flex-start', fontSize:11.5, color:'#8A8AA0', lineHeight:1.45 }}>
      <span style={{ flexShrink:0 }}>{icon}</span>
      <span>{children}</span>
    </div>
  )
}

function Input({ value, onChange, placeholder, type='text', style={} }) {
  return (
    <input
      type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder}
      style={{ width:'100%', background:C.bg, border:`1px solid ${C.border}`, borderRadius:11, padding:'12px 14px', fontSize:14, color:'#fff', ...style }}
    />
  )
}

function Button({ children, onClick, full, disabled }) {
  return (
    <button onClick={onClick} disabled={disabled}
      style={{ width: full ? '100%' : 'auto', background: disabled ? '#33334A' : C.amber, border:'none', borderRadius:13, padding:'15px 26px', fontSize:15, fontWeight:700, color: disabled ? '#777' : C.bg, cursor: disabled ? 'default' : 'pointer', fontFamily:'inherit', boxShadow: disabled ? 'none' : '0 8px 24px rgba(245,166,35,0.28)' }}>
      {children}
    </button>
  )
}

function Centered({ children }) {
  return (
    <div style={{ minHeight:'100vh', background:C.bg, display:'flex', alignItems:'center', justifyContent:'center', padding:'24px', fontFamily:'Inter,sans-serif' }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,700&family=Inter:wght@400;500;600&display=swap');*{box-sizing:border-box;margin:0;padding:0}`}</style>
      <div style={{ textAlign:'center', maxWidth:330, color:C.dim, fontSize:14 }}>{children}</div>
    </div>
  )
}

function Keyframes() {
  return <style>{`@keyframes pop{0%{transform:scale(0.8);opacity:0}60%{transform:scale(1.06)}100%{transform:scale(1);opacity:1}}`}</style>
}
