import { useEffect, useState } from 'react'

const C = {
  bg:'#13131F', amber:'#F5A623', sage:'#7BA05B',
  dim:'rgba(255,255,255,0.4)',
}

/**
 * Boot splash.
 *
 * Shown only while auth is actually resolving — this is NOT a timed intro.
 * A splash that lingers to look impressive is friction on every single open,
 * and the people who feel it most are the daily regulars you most want back.
 *
 * The one concession is MIN_MS: a splash that appears and vanishes in 80ms
 * reads as a flicker or a bug, so it holds briefly if the session resolves
 * instantly. Long enough to feel deliberate, short enough not to be a wait.
 */
const MIN_MS = 550

export default function Splash({ done }) {
  const [hold, setHold]   = useState(true)
  const [leaving, setLeaving] = useState(false)
  const [gone, setGone]   = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setHold(false), MIN_MS)
    return () => clearTimeout(t)
  }, [])

  // Fade rather than cut — a hard swap to a full screen of content is jarring.
  useEffect(() => {
    if (!done || hold) return
    setLeaving(true)
    // Unmount after the transition. Leaving it mounted at opacity 0 would keep
    // a full-screen element over the app; pointerEvents:none saves the taps,
    // but it still hides content from screen readers.
    const t = setTimeout(() => setGone(true), 460)
    return () => clearTimeout(t)
  }, [done, hold])

  if (gone) return null

  return (
    <div
      style={{
        position:'fixed', inset:0, zIndex:9998,
        background:C.bg,
        display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
        opacity: leaving ? 0 : 1,
        pointerEvents: leaving ? 'none' : 'auto',
        transition:'opacity 0.42s ease',
        fontFamily:'Inter,sans-serif',
        // Cover the notch/home indicator so it never shows page behind it
        paddingBottom:'env(safe-area-inset-bottom)',
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,700;1,9..144,600&family=Inter:wght@400;500&display=swap');
        @keyframes hsRise   { from { opacity:0; transform:translateY(14px) } to { opacity:1; transform:none } }
        @keyframes hsGlow   { 0%,100% { opacity:0.5 } 50% { opacity:1 } }
        @keyframes hsDraw   { from { stroke-dashoffset:340 } to { stroke-dashoffset:0 } }
        @keyframes hsPop    { 0% { transform:scale(0.7); opacity:0 } 60% { transform:scale(1.08) } 100% { transform:scale(1); opacity:1 } }
        /* Anyone who's asked their device to cut animation gets a still frame
           rather than a slightly-less-animated one. */
        @media (prefers-reduced-motion: reduce) {
          .hs-splash * { animation:none !important; opacity:1 !important; transform:none !important; stroke-dashoffset:0 !important }
        }
      `}</style>

      <div className="hs-splash" style={{ textAlign:'center', padding:'0 32px' }}>

        {/* A little street: rooftops drawing themselves in, one lit window.
            Cheap to render, and it says "town" faster than any words do. */}
        <svg width="180" height="96" viewBox="0 0 180 96" fill="none" style={{ marginBottom:22 }}>
          {/* back rooftops */}
          <path
            d="M8 82 L8 56 L26 42 L44 56 L44 82 M44 82 L44 48 L62 34 L80 48 L80 82
               M80 82 L80 60 L98 46 L116 60 L116 82 M116 82 L116 52 L134 38 L152 52 L152 82 L172 82"
            stroke="rgba(255,255,255,0.16)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="340"
            style={{ animation:'hsDraw 1.5s ease-out forwards' }}
          />
          {/* the one that's yours */}
          <path
            d="M62 82 L62 50 L80 36 L98 50 L98 82 Z"
            fill="rgba(245,166,35,0.09)"
            stroke={C.amber}
            strokeWidth="2.2"
            strokeLinejoin="round"
            style={{ animation:'hsPop 0.5s ease-out 0.5s both' }}
          />
          {/* lit window */}
          <rect
            x="74" y="60" width="12" height="14" rx="2"
            fill={C.amber}
            style={{ animation:'hsGlow 2.4s ease-in-out 1s infinite' }}
          />
          {/* ground line */}
          <line x1="4" y1="82.5" x2="176" y2="82.5" stroke="rgba(255,255,255,0.1)" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>

        <div style={{ animation:'hsRise 0.6s ease-out 0.25s both' }}>
          <div style={{ fontFamily:'Fraunces,serif', fontSize:33, fontWeight:700, color:'#fff', letterSpacing:'-0.025em', lineHeight:1 }}>
            home<span style={{ color:C.amber }}>spot</span>
          </div>
          <div style={{ fontSize:12.5, color:C.dim, marginTop:11, letterSpacing:'0.02em' }}>
            The businesses around the corner
          </div>
        </div>

        {/* A progress hint rather than a spinner — three dots reads as "nearly
            there", a spinner reads as "something might be wrong". */}
        <div style={{ display:'flex', gap:6, justifyContent:'center', marginTop:30, animation:'hsRise 0.6s ease-out 0.5s both' }}>
          {[0,1,2].map(i=>(
            <div key={i} style={{
              width:5, height:5, borderRadius:'50%', background:C.amber,
              animation:`hsGlow 1.3s ease-in-out ${i*0.18}s infinite`,
            }}/>
          ))}
        </div>
      </div>
    </div>
  )
}
