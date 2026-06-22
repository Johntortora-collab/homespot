import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../lib/AuthContext'
import { useManageSpot } from '../../lib/hooks'
import { supabase } from '../../lib/supabase'

const C = {
  bg:'#FDF8F2', card:'#FFFFFF', navy:'#1A1A2E',
  amber:'#F5A623', amberSoft:'#FEF3DC', amberBrd:'rgba(245,166,35,0.3)',
  sage:'#7BA05B', ink:'#1A1A2E', mid:'#6B7280', muted:'#9CA3AF', border:'#E8E3DC',
}

const CATEGORIES = ['Bakery','Coffee','Restaurant','Salon','Barbershop','Bookshop','Florist','Gym','Boutique','Auto','Pet care','Other']
const PERK_IDEAS = ['Free coffee','Free pastry','10% off','Free dessert','$5 off','Free item of choice']
const EMOJIS     = ['🥐','☕','🍕','✂️','📚','🌸','💪','🎨','🛒','🐾','🔧','🏪','🍔','🍣','🧁','🌮','🍷','🎵']

function Logo({ dark=false }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
      <svg width={28} height={28} viewBox="0 0 32 32" fill="none">
        <circle cx="16" cy="16" r="16" fill={C.amber}/>
        <path d="M16 7L24 14V25H19V19H13V25H8V14Z" fill={C.navy}/>
        <circle cx="16" cy="13" r="2.5" fill={C.amber}/>
      </svg>
      <span style={{ fontFamily:'Fraunces,serif', fontSize:20, fontWeight:700, color:dark?C.navy:'#fff', letterSpacing:'-0.02em' }}>
        home<span style={{ color:C.amber }}>spot</span>
      </span>
    </div>
  )
}

function SpotPreview({ biz }) {
  const name    = biz.name    || 'Your Business'
  const emoji   = biz.emoji   || '🏪'
  const tag     = biz.tagline || 'Your tagline here'
  const perk    = biz.perk    || 'Your perk'
  const stamps  = parseInt(biz.stamps) || 8
  const filled  = Math.floor(stamps * 0.6)

  return (
    <div style={{ background:C.navy, borderRadius:28, padding:'18px 13px 16px', width:195, boxShadow:'0 24px 60px rgba(0,0,0,0.2)', flexShrink:0 }}>
      <div style={{ background:'#222238', borderRadius:13, padding:'11px', marginBottom:9 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
          <span style={{ fontSize:22 }}>{emoji}</span>
          <div>
            <div style={{ fontFamily:'Fraunces,serif', fontSize:11, color:'#fff', fontWeight:600 }}>{name.slice(0,16)}{name.length>16?'…':''}</div>
            <div style={{ fontSize:9, color:'rgba(255,255,255,0.4)' }}>{tag.slice(0,20)}{tag.length>20?'…':''}</div>
          </div>
        </div>
        <div style={{ display:'flex', gap:4, flexWrap:'wrap' }}>
          {Array.from({length:Math.min(stamps,10)}).map((_,i)=>(
            <div key={i} style={{ width:10, height:10, borderRadius:'50%', background:i<filled?C.amber:'#2A2A42', border:`1px solid ${i<filled?C.amber:'#3A3A52'}` }}/>
          ))}
        </div>
        <div style={{ fontSize:9, color:'rgba(255,255,255,0.3)', marginTop:5 }}>{stamps-filled} more → {perk.slice(0,18)}</div>
      </div>
      <div style={{ fontSize:9, color:'rgba(255,255,255,0.3)', textAlign:'center' }}>Live preview</div>
    </div>
  )
}

function Input({ value, onChange, placeholder, type='text', maxLength }) {
  const [f, setF] = useState(false)
  return (
    <input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} maxLength={maxLength}
      onFocus={()=>setF(true)} onBlur={()=>setF(false)}
      style={{ width:'100%', background:C.bg, border:`1.5px solid ${f?C.amber:C.border}`, borderRadius:11, padding:'12px 14px', fontSize:14, color:C.ink, fontFamily:'Inter,sans-serif', transition:'border-color 0.2s' }}/>
  )
}

function Field({ label, hint, children }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
      <label style={{ fontSize:13, fontWeight:600, color:C.ink }}>{label}</label>
      {children}
      {hint && <div style={{ fontSize:11, color:C.muted }}>{hint}</div>}
    </div>
  )
}

function Steps({ current, labels }) {
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:0 }}>
      {labels.map((label,i) => (
        <div key={i} style={{ display:'flex', alignItems:'center' }}>
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:4 }}>
            <div style={{ width:30, height:30, borderRadius:'50%', background:i<current?C.sage:i===current?C.amber:C.bg, border:`2px solid ${i<current?C.sage:i===current?C.amber:C.border}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:i<current?13:12, color:i<=current?'#fff':C.muted, fontWeight:600, transition:'all 0.3s' }}>
              {i<current?'✓':i+1}
            </div>
            <div style={{ fontSize:10, color:i===current?C.amber:i<current?C.sage:C.muted, fontWeight:i===current?600:400, whiteSpace:'nowrap' }}>{label}</div>
          </div>
          {i<labels.length-1 && <div style={{ width:44, height:2, background:i<current?C.sage:C.border, margin:'0 4px', marginBottom:18, transition:'background 0.3s' }}/>}
        </div>
      ))}
    </div>
  )
}

// Declared once at module scope — NOT inside OwnerOnboarding — so it keeps a
// stable identity across re-renders. Defining a component inline inside
// another component's body (as this used to be) makes React treat it as a
// brand-new component type on every re-render, which remounts its entire
// subtree and kicks focus out of any input inside it on every keystroke.
function Shell({ step, navigate, biz, withPreview, children }) {
  const STEP_LABELS = ['Account','Your spot','Loyalty card','Go live']
  return (
    <div style={{ minHeight:'100vh', display:'flex', flexDirection:'column', fontFamily:'Inter,sans-serif' }}>
      <div style={{ background:C.navy, padding:'18px 24px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <Logo/>
        <div style={{ fontSize:12, color:'rgba(255,255,255,0.4)' }}>
          <span onClick={()=>navigate('/owner')} style={{ color:C.amber, cursor:'pointer', fontWeight:600 }}>← Back to start</span>
        </div>
      </div>
      <div style={{ flex:1, display:'flex', justifyContent:'center', padding:'28px 16px 50px', background:C.bg }}>
        <div style={{ width:'100%', maxWidth:920 }}>
          <div className="ob-steps" style={{ display:'flex', justifyContent:'center', marginBottom:32, overflowX:'auto' }}>
            <Steps current={step-1} labels={STEP_LABELS}/>
          </div>
          <div className="ob-layout" style={{ display:'flex', gap:32, alignItems:'flex-start', justifyContent:'center' }}>
            <div style={{ flex:1, maxWidth:500, width:'100%' }}>{children}</div>
            {withPreview && (
              <div className="ob-preview" style={{ flexShrink:0, position:'sticky', top:32 }}>
                <div style={{ fontSize:11, fontWeight:600, color:C.muted, textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:11, textAlign:'center' }}>Your spot preview</div>
                <SpotPreview biz={biz}/>
              </div>
            )}
          </div>
        </div>
      </div>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,600;0,9..144,700;1,9..144,400&family=Inter:wght@400;500;600&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        input,select,textarea{outline:none;font-family:inherit}
        input::placeholder,textarea::placeholder{color:#C4B8A8}
        button{font-family:inherit}
        @keyframes up{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
        @keyframes pop{0%{transform:scale(0.8);opacity:0}60%{transform:scale(1.06)}100%{transform:scale(1);opacity:1}}
        select{appearance:none;-webkit-appearance:none}

        .ob-field-grid { display:grid; grid-template-columns:1fr 1fr; gap:13px; }

        @media (max-width: 760px) {
          .ob-layout { flex-direction:column; align-items:center; }
          .ob-preview { position:static; order:-1; margin-bottom:8px; }
          .ob-steps :global(span) { font-size:9px; }
        }
        @media (max-width: 480px) {
          .ob-field-grid { grid-template-columns:1fr; }
        }
      `}</style>
    </div>
  )
}

export default function OwnerOnboarding() {
  const [step, setStep]   = useState(0)
  const [biz,  setBiz]    = useState({ firstName:'', lastName:'', email:'', password:'', name:'', category:'', tagline:'', phone:'', address:'', town:'', townId:'', emoji:'🏪', perk:'', stamps:'8' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [awaitingConfirm, setAwaitingConfirm] = useState(false)
  const [authMode, setAuthMode] = useState('signup') // 'signup' | 'signin'
  const navigate = useNavigate()
  const { signUp, signIn, signInWithGoogle } = useAuth()
  const { createSpot } = useManageSpot()

  const update = (k,v) => setBiz(p=>({...p,[k]:v}))

  async function handleGoogleSignIn() {
    setError('')
    const { error } = await signInWithGoogle('owner')
    if (error) setError(error.message)
    // On success, Supabase redirects the browser away to Google and back —
    // there's nothing further to do here in this render.
  }

  async function handleAccount() {
    setError('')
    setLoading(true)

    if (authMode === 'signin') {
      const { error } = await signIn({ email: biz.email, password: biz.password })
      setLoading(false)
      if (error) { setError(error.message); return }
      // Existing owner signing back in — go straight to their dashboard
      // rather than re-running the spot setup wizard.
      navigate('/owner/dashboard')
      return
    }

    const { data, error } = await signUp({
      email:    biz.email,
      password: biz.password,
      fullName: `${biz.firstName} ${biz.lastName}`.trim(),
      role:     'owner',
    })
    setLoading(false)
    if (error) { setError(error.message); return }

    // If email confirmation is required, there's no session yet — can't
    // safely create a spot (owner_id needs a real authenticated user).
    if (!data?.session) {
      setAwaitingConfirm(true)
      return
    }
    setStep(2)
  }


  async function handleGoLive() {
    setLoading(true)
    setError('')

    // Look up town ID
    const { data: towns } = await supabase.from('towns').select('id').eq('name', biz.town).single()
    if (!towns) { setError('Town not found. Please check the name.'); setLoading(false); return }

    const { error } = await createSpot({
      town_id:          towns.id,
      name:             biz.name,
      emoji:            biz.emoji,
      category:         biz.category,
      tagline:          biz.tagline,
      phone:            biz.phone,
      address:          biz.address,
      stamps_required:  parseInt(biz.stamps),
      perk:             biz.perk,
      color:            '#F5A623',
    })

    setLoading(false)
    if (error) { setError(error.message); return }
    setStep(4)
  }

  const STEP_LABELS = ['Account','Your spot','Loyalty card','Go live']

  // ── STEP 0: Landing ──────────────────────────────────────────────────────
  if (step === 0) return (
    <div style={{ minHeight:'100vh', fontFamily:'Inter,sans-serif' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,600;0,9..144,700;1,9..144,400&family=Inter:wght@400;500;600&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        @keyframes up{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
        .ob-howgrid { display:grid; grid-template-columns:repeat(4,1fr); gap:18px; max-width:900px; margin:0 auto; }
        @media (max-width: 900px) {
          .ob-howgrid { grid-template-columns:repeat(2,1fr); }
          .ob-hero-title { font-size:36px !important; }
          .ob-hero-section { padding:48px 24px 56px !important; }
        }
        @media (max-width: 600px) {
          .ob-howgrid { grid-template-columns:1fr; }
          .ob-navbar-actions span { display:none; }
          .ob-hero-title { font-size:30px !important; }
        }
      `}</style>
      <nav className="ob-navbar-actions-wrap" style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px 24px', background:'#fff', borderBottom:`1px solid ${C.border}`, position:'sticky', top:0, zIndex:10 }}>
        <Logo dark/>
        <div className="ob-navbar-actions" style={{ display:'flex', gap:16, alignItems:'center' }}>
          <span onClick={()=>{ setAuthMode('signin'); setStep(1) }} style={{ fontSize:14, color:C.mid, cursor:'pointer' }}>Already listed? <span style={{ color:C.amber, fontWeight:600 }}>Sign in</span></span>
          <button onClick={()=>setStep(1)} style={{ background:C.amber, border:'none', borderRadius:11, padding:'10px 22px', fontSize:14, fontWeight:600, color:C.navy, cursor:'pointer', whiteSpace:'nowrap' }}>List your spot →</button>
        </div>
      </nav>

      <div className="ob-hero-section" style={{ background:`linear-gradient(160deg,#211540,${C.navy})`, padding:'72px 48px 80px', position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', inset:0, backgroundImage:'radial-gradient(circle,rgba(245,166,35,0.1) 1px,transparent 1px)', backgroundSize:'20px 20px', pointerEvents:'none' }}/>
        <div style={{ maxWidth:560, position:'relative', zIndex:1 }}>
          <div style={{ display:'inline-block', background:'rgba(245,166,35,0.15)', border:'1px solid rgba(245,166,35,0.3)', borderRadius:20, padding:'5px 14px', fontSize:11, fontWeight:700, color:C.amber, letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:20 }}>Free for local businesses</div>
          <h1 className="ob-hero-title" style={{ fontFamily:'Fraunces,serif', fontSize:48, fontWeight:700, color:'#fff', lineHeight:1.1, marginBottom:16 }}>
            Your regulars<br/><span style={{ color:C.amber, fontStyle:'italic' }}>deserve better</span><br/>than a punch card
          </h1>
          <p style={{ fontSize:16, color:'rgba(255,255,255,0.55)', lineHeight:1.65, marginBottom:32 }}>
            Track visits, send deals, collect feedback — all from one simple dashboard. Locals find you on Homespot and keep coming back.
          </p>
          <div style={{ display:'flex', gap:12, alignItems:'center', flexWrap:'wrap' }}>
            <button onClick={()=>setStep(1)} style={{ background:C.amber, border:'none', borderRadius:14, padding:'15px 32px', fontSize:16, fontWeight:700, color:C.navy, cursor:'pointer', boxShadow:'0 8px 28px rgba(245,166,35,0.45)' }}>List my spot — it's free</button>
            <div style={{ fontSize:13, color:'rgba(255,255,255,0.35)' }}>Takes 5 minutes · No credit card</div>
          </div>
        </div>
      </div>

      <div style={{ padding:'64px 24px', background:C.bg }}>
        <div style={{ textAlign:'center', marginBottom:44 }}>
          <h2 style={{ fontFamily:'Fraunces,serif', fontSize:32, fontWeight:700, color:C.ink }}>Up and running in minutes</h2>
        </div>
        <div className="ob-howgrid">
          {[
            ['📝','Create your listing','Add your name, category, and a one-liner. Locals find you immediately.'],
            ['✦','Set your Spot Card','Choose stamps needed and what perk customers earn. You\'re in control.'],
            ['⬡','Put QR by register','Customers scan when they check out. Stamp added. That\'s it.'],
            ['📣','Send deals anytime','Slow Tuesday? Send an offer in two taps. Customers get it instantly.'],
          ].map(([ic,ti,bo])=>(
            <div key={ti} style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:16, padding:'20px 18px' }}>
              <div style={{ width:42, height:42, background:C.amberSoft, borderRadius:11, display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, marginBottom:13 }}>{ic}</div>
              <div style={{ fontFamily:'Fraunces,serif', fontSize:15, fontWeight:700, color:C.ink, marginBottom:7, lineHeight:1.3 }}>{ti}</div>
              <div style={{ fontSize:13, color:C.muted, lineHeight:1.55 }}>{bo}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ background:C.navy, padding:'48px', textAlign:'center' }}>
        <button onClick={()=>setStep(1)} style={{ background:C.amber, border:'none', borderRadius:14, padding:'15px 40px', fontSize:16, fontWeight:700, color:C.navy, cursor:'pointer', boxShadow:'0 8px 28px rgba(245,166,35,0.4)' }}>
          List my spot for free →
        </button>
        <div style={{ fontSize:12, color:'rgba(255,255,255,0.3)', marginTop:10 }}>No credit card · No commitment · Cancel anytime</div>
      </div>
    </div>
  )

  if (awaitingConfirm) return (
    <div style={{ minHeight:'100vh', background:C.bg, display:'flex', flexDirection:'column', fontFamily:'Inter,sans-serif' }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,600;0,9..144,700;1,9..144,400&family=Inter:wght@400;500;600&display=swap');*{box-sizing:border-box;margin:0;padding:0}@keyframes up{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}`}</style>
      <div style={{ background:C.navy, padding:'18px 24px' }}><Logo/></div>
      <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', padding:'48px 24px' }}>
        <div style={{ textAlign:'center', maxWidth:380, animation:'up 0.4s ease' }}>
          <div style={{ fontSize:52, marginBottom:20 }}>💌</div>
          <h1 style={{ fontFamily:'Fraunces,serif', fontSize:28, fontWeight:700, color:C.ink, marginBottom:12 }}>Check your email</h1>
          <p style={{ fontSize:15, color:C.muted, lineHeight:1.6, marginBottom:6 }}>We sent a confirmation link to</p>
          <p style={{ fontSize:16, color:C.amber, fontWeight:600, marginBottom:20 }}>{biz.email}</p>
          <p style={{ fontSize:14, color:C.mid, lineHeight:1.65, marginBottom:28 }}>
            Tap the link to activate your account, then come back and sign in to finish setting up {biz.name || 'your business'}.
          </p>
          <button onClick={()=>navigate('/owner/dashboard')} style={{ background:C.amber, border:'none', borderRadius:13, padding:'13px 30px', fontSize:14, fontWeight:600, color:C.navy, cursor:'pointer' }}>
            I've confirmed — sign in
          </button>
        </div>
      </div>
    </div>
  )

  // ── STEP 1: Account ──────────────────────────────────────────────────────
  if (step === 1) return (
    <Shell step={step} navigate={navigate} biz={biz}>
      <div style={{ animation:'up 0.3s ease' }}>
        <div style={{ marginBottom:24 }}>
          <div style={{ fontSize:11, fontWeight:700, color:C.amber, letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:8 }}>Step 1 of 4</div>
          <h2 style={{ fontFamily:'Fraunces,serif', fontSize:28, fontWeight:700, color:C.ink, marginBottom:5 }}>
            {authMode === 'signin' ? 'Sign in to your account' : 'Create your account'}
          </h2>
          <p style={{ fontSize:14, color:C.muted }}>
            {authMode === 'signin' ? 'Pick up where you left off.' : 'One login for your dashboard, QR code, and everything else.'}
          </p>
        </div>

        <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:17, padding:'26px 26px', display:'flex', flexDirection:'column', gap:16 }}>
          {/* Mode toggle */}
          <div style={{ display:'flex', background:C.bg, borderRadius:11, padding:4 }}>
            {['signup','signin'].map(mode => (
              <button key={mode} onClick={()=>{ setAuthMode(mode); setError('') }} style={{ flex:1, background:authMode===mode?C.amber:'none', border:'none', borderRadius:8, padding:'9px', fontSize:13, fontWeight:600, color:authMode===mode?C.navy:C.mid, transition:'all 0.2s' }}>
                {mode === 'signup' ? 'Create account' : 'Sign in'}
              </button>
            ))}
          </div>

          {authMode === 'signup' && (
            <div className="ob-field-grid">
              <Field label="First name"><Input value={biz.firstName} onChange={v=>update('firstName',v)} placeholder="Rosa"/></Field>
              <Field label="Last name"><Input value={biz.lastName} onChange={v=>update('lastName',v)} placeholder="Martinez"/></Field>
            </div>
          )}
          <Field label="Email address"><Input type="email" value={biz.email} onChange={v=>update('email',v)} placeholder="rosa@example.com"/></Field>
          <Field label="Password" hint={authMode==='signup' ? 'At least 8 characters' : undefined}>
            <Input type="password" value={biz.password} onChange={v=>update('password',v)} placeholder="••••••••"/>
          </Field>

          {error && <div style={{ background:'#FEF2F2', border:'1px solid #FECACA', borderRadius:10, padding:'10px 13px', fontSize:13, color:'#DC2626' }}>⚠ {error}</div>}

          {authMode === 'signup' ? (
            <button onClick={handleAccount} disabled={loading||!biz.email||!biz.password||!biz.firstName} style={{ background:biz.firstName&&biz.email&&biz.password.length>=8?C.amber:'#E8E3DC', border:'none', borderRadius:12, padding:'14px', fontSize:15, fontWeight:600, color:biz.firstName&&biz.email&&biz.password.length>=8?C.navy:C.muted, cursor:'pointer', transition:'all 0.2s' }}>
              {loading ? 'Creating account…' : 'Create account →'}
            </button>
          ) : (
            <button onClick={handleAccount} disabled={loading||!biz.email||!biz.password} style={{ background:biz.email&&biz.password?C.amber:'#E8E3DC', border:'none', borderRadius:12, padding:'14px', fontSize:15, fontWeight:600, color:biz.email&&biz.password?C.navy:C.muted, cursor:'pointer', transition:'all 0.2s' }}>
              {loading ? 'Signing in…' : 'Sign in →'}
            </button>
          )}

          <div style={{ display:'flex', gap:10, alignItems:'center' }}>
            <div style={{ flex:1, height:1, background:C.border }}/><span style={{ fontSize:11, color:C.muted }}>or</span><div style={{ flex:1, height:1, background:C.border }}/>
          </div>

          <button onClick={handleGoogleSignIn} style={{ background:'#fff', border:`1px solid ${C.border}`, borderRadius:11, padding:'12px', fontSize:14, fontWeight:600, color:'#111', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:10 }}>
            <span style={{ fontFamily:'Georgia,serif', color:'#4285F4', fontWeight:700, fontSize:15 }}>G</span> Continue with Google
          </button>

          {authMode === 'signup' && (
            <p style={{ fontSize:11, color:C.muted, textAlign:'center', lineHeight:1.6 }}>
              By creating an account you agree to our <a href="/terms" target="_blank" style={{ color:C.mid, textDecoration:'underline' }}>Terms of Service</a> and <a href="/privacy" target="_blank" style={{ color:C.mid, textDecoration:'underline' }}>Privacy Policy</a>. Homespot never sells your data.
            </p>
          )}
        </div>

        <div style={{ textAlign:'center', marginTop:14 }}>
          <button onClick={()=>setStep(0)} style={{ background:'none', border:'none', fontSize:13, color:C.mid, cursor:'pointer' }}>← Back</button>
        </div>
      </div>
    </Shell>
  )

  // ── STEP 2: Business details ─────────────────────────────────────────────
  if (step === 2) return (
    <Shell step={step} navigate={navigate} biz={biz} withPreview>
      <div style={{ animation:'up 0.3s ease' }}>
        <div style={{ marginBottom:22 }}>
          <div style={{ fontSize:11, fontWeight:700, color:C.amber, letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:8 }}>Step 2 of 4</div>
          <h2 style={{ fontFamily:'Fraunces,serif', fontSize:28, fontWeight:700, color:C.ink, marginBottom:5 }}>Tell us about your spot</h2>
          <p style={{ fontSize:14, color:C.muted }}>Watch the preview update as you type.</p>
        </div>

        <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:17, padding:'24px 26px', display:'flex', flexDirection:'column', gap:16 }}>
          <Field label="Pick an icon">
            <div style={{ display:'flex', flexWrap:'wrap', gap:7 }}>
              {EMOJIS.map(em=>(
                <button key={em} onClick={()=>update('emoji',em)} style={{ width:38, height:38, borderRadius:9, fontSize:19, background:biz.emoji===em?C.amberSoft:C.bg, border:`2px solid ${biz.emoji===em?C.amber:C.border}`, cursor:'pointer', transition:'all 0.15s', transform:biz.emoji===em?'scale(1.1)':'scale(1)' }}>{em}</button>
              ))}
            </div>
          </Field>

          <Field label="Business name">
            <Input value={biz.name} onChange={v=>update('name',v)} placeholder="e.g. Rosa's Bakery" maxLength={40}/>
          </Field>

          <div className="ob-field-grid">
            <Field label="Category">
              <select value={biz.category} onChange={e=>update('category',e.target.value)} style={{ width:'100%', background:C.bg, border:`1.5px solid ${C.border}`, borderRadius:11, padding:'12px 14px', fontSize:14, color:biz.category?C.ink:C.muted, cursor:'pointer' }}>
                <option value="">Select…</option>
                {CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="Town / City">
              <Input value={biz.town} onChange={v=>update('town',v)} placeholder="e.g. Maplewood"/>
            </Field>
          </div>

          <Field label="One-line description" hint="Shown under your name in the app">
            <Input value={biz.tagline} onChange={v=>update('tagline',v)} placeholder="Family-owned since 1987" maxLength={50}/>
          </Field>

          <div className="ob-field-grid">
            <Field label="Phone (optional)"><Input type="tel" value={biz.phone} onChange={v=>update('phone',v)} placeholder="(555) 000-0000"/></Field>
            <Field label="Address (optional)"><Input value={biz.address} onChange={v=>update('address',v)} placeholder="123 Main St"/></Field>
          </div>

          <div style={{ display:'flex', gap:11 }}>
            <button onClick={()=>setStep(1)} style={{ flex:1, background:C.bg, border:`1px solid ${C.border}`, borderRadius:11, padding:'12px', fontSize:14, fontWeight:600, color:C.mid, cursor:'pointer' }}>← Back</button>
            <button onClick={()=>biz.name&&biz.category&&biz.town&&setStep(3)} style={{ flex:2, background:biz.name&&biz.category&&biz.town?C.amber:'#E8E3DC', border:'none', borderRadius:11, padding:'12px', fontSize:14, fontWeight:600, color:biz.name&&biz.category&&biz.town?C.navy:C.muted, cursor:'pointer', transition:'all 0.2s' }}>Looks good →</button>
          </div>
        </div>
      </div>
    </Shell>
  )

  // ── STEP 3: Loyalty card ─────────────────────────────────────────────────
  if (step === 3) return (
    <Shell step={step} navigate={navigate} biz={biz} withPreview>
      <div style={{ animation:'up 0.3s ease' }}>
        <div style={{ marginBottom:22 }}>
          <div style={{ fontSize:11, fontWeight:700, color:C.amber, letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:8 }}>Step 3 of 4</div>
          <h2 style={{ fontFamily:'Fraunces,serif', fontSize:28, fontWeight:700, color:C.ink, marginBottom:5 }}>Set up your Spot Card</h2>
          <p style={{ fontSize:14, color:C.muted }}>Customers earn a stamp each visit. Fill the card, earn a perk.</p>
        </div>

        <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:17, padding:'24px 26px', display:'flex', flexDirection:'column', gap:20 }}>
          <Field label="Stamps needed" hint={`Customers visit ${biz.stamps} times to earn a perk`}>
            <div style={{ display:'flex', alignItems:'center', gap:14, marginTop:4 }}>
              <input type="range" min={4} max={15} value={biz.stamps} onChange={e=>update('stamps',e.target.value)} style={{ flex:1, accentColor:C.amber, height:5 }}/>
              <div style={{ fontFamily:'Fraunces,serif', fontSize:26, fontWeight:700, color:C.amber, minWidth:28 }}>{biz.stamps}</div>
            </div>
            <div style={{ display:'flex', flexWrap:'wrap', gap:7, marginTop:11 }}>
              {Array.from({length:parseInt(biz.stamps)}).map((_,i)=>(
                <div key={i} style={{ width:30, height:30, borderRadius:'50%', background:i<Math.floor(parseInt(biz.stamps)*0.6)?C.amberSoft:C.bg, border:`2px solid ${i<Math.floor(parseInt(biz.stamps)*0.6)?C.amber:C.border}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, transition:'all 0.2s' }}>
                  {i<Math.floor(parseInt(biz.stamps)*0.6)?'✦':''}
                </div>
              ))}
            </div>
          </Field>

          <Field label="What do they earn?">
            <Input value={biz.perk} onChange={v=>update('perk',v)} placeholder="e.g. Free pastry of your choice" maxLength={50}/>
            <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginTop:9 }}>
              {PERK_IDEAS.map(p=>(
                <button key={p} onClick={()=>update('perk',p)} style={{ background:biz.perk===p?C.amberSoft:C.bg, border:`1px solid ${biz.perk===p?C.amber:C.border}`, borderRadius:20, padding:'5px 11px', fontSize:12, color:biz.perk===p?'#8A6A00':C.mid, cursor:'pointer', fontWeight:biz.perk===p?600:400, transition:'all 0.15s' }}>{p}</button>
              ))}
            </div>
          </Field>

          {error && <div style={{ background:'#FEF2F2', border:'1px solid #FECACA', borderRadius:10, padding:'10px 13px', fontSize:13, color:'#DC2626' }}>⚠ {error}</div>}

          <div style={{ display:'flex', gap:11 }}>
            <button onClick={()=>setStep(2)} style={{ flex:1, background:C.bg, border:`1px solid ${C.border}`, borderRadius:11, padding:'12px', fontSize:14, fontWeight:600, color:C.mid, cursor:'pointer' }}>← Back</button>
            <button onClick={handleGoLive} disabled={loading||!biz.perk.trim()} style={{ flex:2, background:biz.perk.trim()&&!loading?C.amber:'#E8E3DC', border:'none', borderRadius:11, padding:'12px', fontSize:14, fontWeight:600, color:biz.perk.trim()&&!loading?C.navy:C.muted, cursor:'pointer', transition:'all 0.2s' }}>
              {loading?'Going live…':'Go live →'}
            </button>
          </div>
        </div>
      </div>
    </Shell>
  )

  // ── STEP 4: Done ─────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight:'100vh', background:C.bg, display:'flex', flexDirection:'column', fontFamily:'Inter,sans-serif' }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,600;0,9..144,700;1,9..144,400&family=Inter:wght@400;500;600&display=swap');*{box-sizing:border-box;margin:0;padding:0}@keyframes pop{0%{transform:scale(0.8);opacity:0}60%{transform:scale(1.06)}100%{transform:scale(1);opacity:1}}@keyframes up{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}`}</style>
      <div style={{ background:C.navy, padding:'18px 48px' }}><Logo/></div>
      <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', padding:'48px 24px' }}>
        <div style={{ textAlign:'center', maxWidth:520, animation:'up 0.5s ease' }}>
          <div style={{ width:76, height:76, borderRadius:'50%', background:`linear-gradient(135deg,${C.amber},#E8956D)`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:34, margin:'0 auto 22px', boxShadow:'0 12px 40px rgba(245,166,35,0.45)', animation:'pop 0.6s ease' }}>✓</div>
          <h1 style={{ fontFamily:'Fraunces,serif', fontSize:34, fontWeight:700, color:C.ink, lineHeight:1.15, marginBottom:10 }}>
            {biz.emoji} {biz.name} is live!
          </h1>
          <p style={{ fontSize:15, color:C.muted, lineHeight:1.65, marginBottom:28 }}>
            Your spot is now live in <strong style={{ color:C.ink }}>{biz.town}</strong>. Locals can find you right now on Homespot.
          </p>

          <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:17, padding:'22px 24px', marginBottom:22, textAlign:'left' }}>
            <div style={{ fontFamily:'Fraunces,serif', fontSize:16, fontWeight:700, color:C.ink, marginBottom:16 }}>Three things to do now</div>
            {[
              ['⬡','Print your QR code','Download from your dashboard and put it by the register.'],
              ['📣','Send your first offer','Create a welcome deal — something simple like 10% off.'],
              ['◎','Tell your regulars','Post on social that you\'re on Homespot.'],
            ].map(([ic,ti,bo])=>(
              <div key={ti} style={{ display:'flex', gap:13, alignItems:'flex-start', marginBottom:13 }}>
                <div style={{ width:38, height:38, background:C.amberSoft, borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center', fontSize:17, flexShrink:0 }}>{ic}</div>
                <div>
                  <div style={{ fontSize:14, fontWeight:600, color:C.ink, marginBottom:2 }}>{ti}</div>
                  <div style={{ fontSize:12, color:C.muted, lineHeight:1.5 }}>{bo}</div>
                </div>
              </div>
            ))}
          </div>

          <button onClick={()=>navigate('/owner/dashboard')} style={{ width:'100%', background:C.amber, border:'none', borderRadius:13, padding:'15px', fontSize:15, fontWeight:700, color:C.navy, cursor:'pointer', boxShadow:'0 8px 28px rgba(245,166,35,0.4)' }}>
            Go to my dashboard →
          </button>
        </div>
      </div>
    </div>
  )
}
