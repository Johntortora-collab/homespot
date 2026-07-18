import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const C = {
  bg:'#13131F', card:'#1E1E30',
  amber:'#F5A623',
  border:'rgba(255,255,255,0.07)',
}

// Where a Supabase recovery link lands.
//
// The recovery email sends the user to /reset-password#access_token=...&type=recovery.
// The Supabase client picks that hash up on load and creates a real session, which is
// why this route has to sit ABOVE the role checks in App.jsx's Router — otherwise the
// router sees a session, checks profile.role, and bounces them straight into the app
// before they ever get to choose a new password.
export default function ResetPassword() {
  const navigate = useNavigate()

  const [status, setStatus] = useState('checking')  // checking | ready | invalid | done
  const [pw,     setPw]     = useState('')
  const [conf,   setConf]   = useState('')
  const [busy,   setBusy]   = useState(false)
  const [error,  setError]  = useState('')

  useEffect(() => {
    let settled = false

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || session) {
        settled = true
        setStatus('ready')
      }
    })

    // The event above may have already fired before this component mounted,
    // so check directly too.
    supabase.auth.getSession().then(({ data }) => {
      if (data?.session) {
        settled = true
        setStatus('ready')
      } else {
        // Give the client a moment to parse the URL hash before giving up.
        setTimeout(() => { if (!settled) setStatus('invalid') }, 2500)
      }
    })

    return () => sub?.subscription?.unsubscribe()
  }, [])

  async function handleSubmit() {
    setError('')
    if (pw.length < 8)  return setError('Password must be at least 8 characters.')
    if (pw !== conf)    return setError("Passwords don't match.")

    setBusy(true)
    const { error: err } = await supabase.auth.updateUser({ password: pw })
    setBusy(false)
    if (err) return setError(err.message)

    setStatus('done')
  }

  const inputStyle = {
    width:'100%', background:C.card, border:`1px solid ${C.border}`,
    borderRadius:11, padding:'12px 14px', fontSize:14, color:'#fff',
    outline:'none', fontFamily:'inherit',
  }

  const ready = pw.length >= 8 && conf.length >= 8

  return (
    <div style={{ minHeight:'100vh', background:C.bg, display:'flex', alignItems:'center', justifyContent:'center', padding:'24px', fontFamily:'Inter,sans-serif' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,700&family=Inter:wght@400;500;600&display=swap');
        *{box-sizing:border-box}
        input::placeholder{color:#555}
      `}</style>

      <div style={{ width:'100%', maxWidth:340 }}>
        <div style={{ textAlign:'center', marginBottom:26 }}>
          <div style={{ fontSize:30, marginBottom:10 }}>📍</div>
          <div style={{ fontFamily:'Fraunces,serif', fontSize:19, fontWeight:700, color:'#fff' }}>
            home<span style={{ color:C.amber }}>spot</span>
          </div>
        </div>

        {status === 'checking' && (
          <p style={{ textAlign:'center', fontSize:13.5, color:'#888' }}>Checking your link…</p>
        )}

        {status === 'invalid' && (
          <div style={{ textAlign:'center' }}>
            <h2 style={{ fontFamily:'Fraunces,serif', fontSize:20, color:'#fff', fontWeight:700, marginBottom:10 }}>Link expired</h2>
            <p style={{ fontSize:13.5, color:'#888', lineHeight:1.6, marginBottom:22 }}>
              Password reset links are single-use and time-limited. Request a fresh one from the sign-in screen.
            </p>
            <button onClick={()=>navigate('/')} style={{ background:C.amber, border:'none', borderRadius:13, padding:'13px 26px', fontSize:14, fontWeight:600, color:C.bg, cursor:'pointer' }}>
              Back to sign in
            </button>
          </div>
        )}

        {status === 'ready' && (
          <>
            <h2 style={{ fontFamily:'Fraunces,serif', fontSize:20, color:'#fff', fontWeight:700, marginBottom:6, textAlign:'center' }}>Choose a new password</h2>
            <p style={{ fontSize:13, color:'#888', lineHeight:1.6, marginBottom:22, textAlign:'center' }}>
              Pick something only you know — at least 8 characters.
            </p>

            <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
              <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
                <label style={{ fontSize:12, color:'#888' }}>New password</label>
                <input type="password" value={pw} onChange={e=>setPw(e.target.value)} placeholder="At least 8 characters" style={inputStyle} autoFocus />
              </div>

              <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
                <label style={{ fontSize:12, color:'#888' }}>Confirm new password</label>
                <input type="password" value={conf} onChange={e=>setConf(e.target.value)} placeholder="Type it again" style={inputStyle}
                  onKeyDown={e=>{ if (e.key === 'Enter' && ready && !busy) handleSubmit() }} />
              </div>

              {error && (
                <div style={{ background:'rgba(220,38,38,0.1)', border:'1px solid rgba(220,38,38,0.3)', borderRadius:10, padding:'10px 13px', fontSize:13, color:'#F87171' }}>
                  ⚠ {error}
                </div>
              )}

              <button onClick={handleSubmit} disabled={!ready || busy}
                style={{ background: ready && !busy ? C.amber : '#252538', border:'none', borderRadius:13, padding:'14px', fontSize:15, fontWeight:600, color: ready && !busy ? C.bg : '#555', cursor: ready && !busy ? 'pointer' : 'default', marginTop:4 }}>
                {busy ? 'Saving…' : 'Save new password'}
              </button>
            </div>
          </>
        )}

        {status === 'done' && (
          <div style={{ textAlign:'center' }}>
            <div style={{ fontSize:44, marginBottom:16 }}>✅</div>
            <h2 style={{ fontFamily:'Fraunces,serif', fontSize:20, color:'#fff', fontWeight:700, marginBottom:10 }}>Password updated</h2>
            <p style={{ fontSize:13.5, color:'#888', lineHeight:1.6, marginBottom:22 }}>
              You're signed in. Use this password next time you log in.
            </p>
            <button onClick={()=>navigate('/')} style={{ background:C.amber, border:'none', borderRadius:13, padding:'13px 26px', fontSize:14, fontWeight:600, color:C.bg, cursor:'pointer' }}>
              Continue to Homespot →
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
