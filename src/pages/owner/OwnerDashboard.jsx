import { useState, useRef, useEffect } from 'react'
import { useAuth } from '../../lib/AuthContext'
import { useMySpot, useDashboardStats, useRealtimeVisits, useSendOffer, useOwnerFeedback, useManageSpot, useLiveOffers, useSpotRedemptions } from '../../lib/hooks'
import { supabase } from '../../lib/supabase'

const C = {
  bg:'#FDF8F2', card:'#FFFFFF', navy:'#1A1A2E',
  amber:'#F5A623', amberSoft:'#FEF3DC', amberBrd:'rgba(245,166,35,0.3)',
  sage:'#7BA05B', sageSoft:'#EDF4E8',
  rose:'#E8956D', roseSoft:'#FDF0EA',
  purple:'#9B6B9B',
  ink:'#1A1A2E', mid:'#6B7280', muted:'#9CA3AF', border:'#E8E3DC',
}

function Logo() {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:7 }}>
      <svg width={26} height={26} viewBox="0 0 32 32" fill="none">
        <circle cx="16" cy="16" r="16" fill={C.amber}/>
        <path d="M16 7L24 14V25H19V19H13V25H8V14Z" fill={C.navy}/>
        <circle cx="16" cy="13" r="2.5" fill={C.amber}/>
      </svg>
      <span style={{ fontFamily:'Fraunces,serif', fontSize:17, fontWeight:700, color:'#fff', letterSpacing:'-0.02em' }}>
        home<span style={{ color:C.amber }}>spot</span>
      </span>
    </div>
  )
}

function PageHeader({ eyebrow, title, sub }) {
  return (
    <div style={{ marginBottom:26 }}>
      <div style={{ fontSize:11, fontWeight:700, color:C.amber, letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:5 }}>{eyebrow}</div>
      <h1 style={{ fontFamily:'Fraunces,serif', fontSize:28, fontWeight:700, color:C.ink, lineHeight:1.15, marginBottom:5 }}>{title}</h1>
      {sub && <p style={{ fontSize:13, color:C.muted }}>{sub}</p>}
    </div>
  )
}

export default function OwnerDashboard() {
  const [page, setPage] = useState('overview')
  const { profile, signOut } = useAuth()
  const { spot, loading: spotLoading, refetch: refetchSpot } = useMySpot()

  // First time an owner lands here with no spot yet, jump straight into
  // spot creation rather than making them notice a button on an empty state.
  useEffect(() => {
    if (!spotLoading && !spot) setPage('create')
  }, [spotLoading, spot])

  const navItems = spot ? [
    { id:'overview',  label:'Overview',   icon:'◈' },
    { id:'customers', label:'Customers',  icon:'◎' },
    { id:'offer',     label:'Send Offer', icon:'✦' },
    { id:'perks',     label:'Perk Claims', icon:'🎁' },
    { id:'feedback',  label:'Feedback',   icon:'◻' },
    { id:'qr',        label:'Tap Tag',    icon:'📲' },
    { id:'settings',  label:'Settings',   icon:'⚙' },
  ] : [
    { id:'create',    label:'Create Spot', icon:'✦' },
  ]

  if (spotLoading) return (
    <div style={{ minHeight:'100vh', background:C.bg, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'Fraunces,serif', fontSize:18, color:C.muted }}>
      Loading your dashboard…
    </div>
  )

  return (
    <div className="ow-shell" style={{ minHeight:'100vh', background:C.bg, fontFamily:'Inter,sans-serif', color:C.ink, display:'flex' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,600;0,9..144,700;1,9..144,400&family=Inter:wght@400;500;600&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        input,select,textarea{outline:none;font-family:inherit}
        input::placeholder,textarea::placeholder{color:#C4B8A8}
        button{font-family:inherit}
        @keyframes up{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
        @keyframes ticker{from{transform:translateX(0)}to{transform:translateX(-50%)}}
        @keyframes pop{0%{transform:scale(0.8);opacity:0}60%{transform:scale(1.06)}100%{transform:scale(1);opacity:1}}
        ::-webkit-scrollbar{width:4px}
        ::-webkit-scrollbar-thumb{background:#E8E3DC;border-radius:2px}

        .ow-stats-grid   { display:grid; grid-template-columns:repeat(4,1fr); gap:12px; margin-bottom:24px; }
        .ow-chart-grid   { display:grid; grid-template-columns:1.5fr 1fr; gap:16px; margin-bottom:22px; }
        .ow-offer-grid   { display:grid; grid-template-columns:1.3fr 1fr; gap:20px; }
        .ow-qr-grid      { display:grid; grid-template-columns:auto 1fr; gap:26px; align-items:start; }
        .ow-table-row    { display:grid; grid-template-columns:2fr 1fr 1fr 1.5fr; }

        @media (max-width: 820px) {
          .ow-stats-grid { grid-template-columns:repeat(2,1fr); }
          .ow-chart-grid, .ow-offer-grid { grid-template-columns:1fr; }
          .ow-qr-grid { grid-template-columns:1fr; }
          .ow-qr-grid > div:first-child { margin:0 auto; }
          .ow-table-row { grid-template-columns:1.6fr 1fr 1fr; font-size:13px; }
          .ow-table-row > div:nth-child(4) { display:none; } /* hide "last visit" col on mobile */
        }

        .ow-sidebar { width:215px; position:sticky; top:0; height:100vh; }
        .ow-main    { padding:30px 34px; max-width:880px; }
        .ow-bottomnav { display:none; }
        .ow-signout-mobile { display:none; }

        @media (max-width: 820px) {
          .ow-shell { flex-direction:column; }
          .ow-sidebar {
            width:100%; height:auto; position:sticky; top:0; z-index:20;
            flex-direction:row !important; align-items:center; justify-content:space-between;
            padding:12px 16px !important;
          }
          .ow-sidebar nav, .ow-sidebar .ow-signout { display:none; }
          .ow-signout-mobile { display:block !important; }
          .ow-spotbadge { margin-top:0 !important; }
          .ow-main { padding:18px 16px 90px; max-width:none; }
          .ow-bottomnav {
            display:flex; position:fixed; bottom:0; left:0; right:0; z-index:30;
            background:#0F0F1E; border-top:1px solid rgba(255,255,255,0.08);
            padding:8px 6px max(8px, env(safe-area-inset-bottom));
            justify-content:space-around; align-items:center;
          }
        }
      `}</style>

      {/* Sidebar / mobile top bar */}
      <aside className="ow-sidebar" style={{ background:C.navy, display:'flex', flexDirection:'column', flexShrink:0 }}>
        <div style={{ padding:'22px 18px 18px' }}>
          <Logo/>
          <div className="ow-spotbadge" style={{ marginTop:12, padding:'9px 11px', background:'rgba(245,166,35,0.1)', border:'1px solid rgba(245,166,35,0.2)', borderRadius:10 }}>
            <div style={{ fontSize:10, color:C.amber, fontWeight:700, letterSpacing:'0.07em', textTransform:'uppercase', marginBottom:2 }}>Business Portal</div>
            <div style={{ fontSize:13, color:'#fff', fontWeight:600, fontFamily:'Fraunces,serif' }}>{spot?.name || 'No spot yet'}</div>
            <div style={{ fontSize:11, color:'rgba(255,255,255,0.4)', marginTop:1 }}>
              {spot ? `${spot.emoji} ${spot.towns?.name}, ${spot.towns?.state}` : profile?.full_name || 'Get started below'}
            </div>
          </div>
        </div>

        <button
          className="ow-signout-mobile"
          onClick={signOut}
          style={{ background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.12)', borderRadius:20, padding:'7px 14px', fontSize:12, fontWeight:600, color:'rgba(255,255,255,0.75)', cursor:'pointer', flexShrink:0, fontFamily:'inherit' }}
        >
          Sign out
        </button>

        <nav style={{ flex:1, padding:'6px 11px' }}>
          {navItems.map(item=>(
            <button key={item.id} onClick={()=>setPage(item.id)} style={{ width:'100%', display:'flex', alignItems:'center', gap:9, padding:'10px 11px', borderRadius:9, border:'none', background:page===item.id?'rgba(245,166,35,0.15)':'none', color:page===item.id?C.amber:'rgba(255,255,255,0.5)', cursor:'pointer', marginBottom:2, textAlign:'left', fontSize:13, fontWeight:page===item.id?600:400, transition:'all 0.15s' }}>
              <span style={{ fontSize:15, width:18, textAlign:'center' }}>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        <div className="ow-signout" style={{ padding:'14px 18px', borderTop:'1px solid rgba(255,255,255,0.07)' }}>
          <div style={{ fontSize:11, color:'rgba(255,255,255,0.35)', marginBottom:8 }}>{profile?.full_name}</div>
          <button onClick={signOut} style={{ background:'none', border:'none', fontSize:12, color:'rgba(255,255,255,0.5)', cursor:'pointer', textAlign:'left', padding:0, fontFamily:'inherit' }}>Sign out</button>
        </div>
      </aside>

      {/* Main */}
      <main className="ow-main" style={{ flex:1, overflowY:'auto' }}>
        {page==='overview'  && spot && <Overview  spot={spot}/>}
        {page==='customers' && spot && <Customers spot={spot}/>}
        {page==='offer'     && spot && <SendOfferPage spot={spot}/>}
        {page==='perks'     && spot && <PerkClaimsPage spot={spot}/>}
        {page==='settings'  && spot && <SettingsPage spot={spot} onSaved={refetchSpot}/>}
        {page==='feedback'  && spot && <FeedbackPage spot={spot}/>}
        {page==='qr'        && spot && <QRPage spot={spot}/>}
        {page==='create'    && <CreateSpotPage onCreated={refetchSpot}/>}
        {!spot && page!=='create' && (
          <div style={{ textAlign:'center', padding:'70px 24px' }}>
            <div style={{ fontSize:44, marginBottom:18 }}>🏪</div>
            <div style={{ fontFamily:'Fraunces,serif', fontSize:24, fontWeight:700, color:C.ink, marginBottom:10 }}>Let's set up your spot</div>
            <div style={{ fontSize:14, color:C.muted, marginBottom:24, maxWidth:380, marginLeft:'auto', marginRight:'auto', lineHeight:1.6 }}>
              You're signed in, but don't have a business listed on Homespot yet. It only takes a couple minutes.
            </div>
            <button onClick={()=>setPage('create')} style={{ background:C.amber, border:'none', borderRadius:13, padding:'13px 28px', fontSize:15, fontWeight:600, color:C.navy, cursor:'pointer', boxShadow:'0 6px 20px rgba(245,166,35,0.35)' }}>
              Create your spot →
            </button>
          </div>
        )}
      </main>

      {/* Mobile bottom nav */}
      <nav className="ow-bottomnav">
        {navItems.map(item=>(
          <button key={item.id} onClick={()=>setPage(item.id)} style={{ background:'none', border:'none', display:'flex', flexDirection:'column', alignItems:'center', gap:3, padding:'6px 8px', cursor:'pointer' }}>
            <span style={{ fontSize:18, color:page===item.id?C.amber:'rgba(255,255,255,0.4)' }}>{item.icon}</span>
            <span style={{ fontSize:9, color:page===item.id?C.amber:'rgba(255,255,255,0.4)', fontWeight:page===item.id?600:400 }}>{item.label.split(' ')[0]}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}

// ── OVERVIEW ──────────────────────────────────────────────────────────────────
function Overview({ spot }) {
  const { stats, loading } = useDashboardStats(spot.id)
  const visits = useRealtimeVisits(spot.id)

  const WEEK = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']
  const weekData  = stats?.weekChart  || [0,0,0,0,0,0,0]
  const todayIdx  = stats?.todayIndex ?? -1
  const maxWeek   = Math.max(...weekData, 1) // avoid divide-by-zero when every day is 0

  return (
    <div style={{ animation:'up 0.3s ease' }}>
      <PageHeader
        eyebrow={new Date().toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'})}
        title={`Good morning, ${spot.name.split(' ')[0]} 👋`}
        sub="Here's how your spot is doing"
      />

      {/* Live ticker */}
      <div style={{ background:C.navy, borderRadius:13, padding:'12px 16px', marginBottom:24, overflow:'hidden', display:'flex', alignItems:'center', gap:13 }}>
        <div style={{ fontSize:10, fontWeight:700, color:C.amber, letterSpacing:'0.1em', textTransform:'uppercase', whiteSpace:'nowrap', flexShrink:0 }}>Live ●</div>
        <div style={{ overflow:'hidden', flex:1 }}>
          {visits.length === 0 ? (
            <div style={{ fontSize:12, color:'rgba(255,255,255,0.4)' }}>Waiting for your first scan today…</div>
          ) : (
            <div style={{ display:'flex', gap:28, animation:'ticker 16s linear infinite', width:'max-content' }}>
              {[...visits, ...visits].map((v,i)=>(
                <div key={i} style={{ display:'flex', alignItems:'center', gap:7, whiteSpace:'nowrap' }}>
                  <span style={{ fontSize:14 }}>{v.profiles?.avatar||'🧑'}</span>
                  <span style={{ fontSize:12, color:'rgba(255,255,255,0.7)' }}>
                    <span style={{ color:'#fff', fontWeight:500 }}>{v.profiles?.full_name||'A customer'}</span> earned a stamp
                  </span>
                  <span style={{ fontSize:11, color:'rgba(255,255,255,0.3)' }}>{new Date(v.created_at).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Stat cards */}
      <div className="ow-stats-grid">
        {loading ? Array.from({length:4}).map((_,i)=>(
          <div key={i} style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:14, padding:'16px', height:100 }}/>
        )) : [
          { label:'Visits today',      value:stats?.todayVisits||0,      delta:'today',          color:C.amber,  soft:C.amberSoft,  icon:'🏠' },
          { label:'Active customers',  value:stats?.activeCustomers||0,  delta:'total',          color:C.sage,   soft:C.sageSoft,   icon:'◎'  },
          { label:'Stamps this week',  value:stats?.stampsThisWeek||0,   delta:'this week',      color:C.rose,   soft:C.roseSoft,   icon:'✦'  },
          { label:'Perks redeemed',    value:stats?.perksRedeemed||0,    delta:'all time',       color:C.purple, soft:'#F5EEF5',    icon:'🎁'  },
        ].map(s=>(
          <div key={s.label} style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:14, padding:'16px 15px' }}>
            <div style={{ width:34, height:34, background:s.soft, borderRadius:9, display:'flex', alignItems:'center', justifyContent:'center', fontSize:15, marginBottom:10 }}>{s.icon}</div>
            <div style={{ fontFamily:'Fraunces,serif', fontSize:26, fontWeight:700, color:C.ink, lineHeight:1 }}>{s.value}</div>
            <div style={{ fontSize:11, color:C.mid, marginTop:3 }}>{s.label}</div>
            <div style={{ fontSize:10, color:s.color, fontWeight:600, marginTop:5 }}>{s.delta}</div>
          </div>
        ))}
      </div>

      {/* Bar chart + recent */}
      <div className="ow-chart-grid">
        <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:14, padding:'18px 20px' }}>
          <div style={{ fontFamily:'Fraunces,serif', fontSize:15, fontWeight:700, color:C.ink, marginBottom:4 }}>Visits this week</div>
          <div style={{ fontSize:11, color:C.muted, marginBottom:16 }}>{weekData.reduce((a,b)=>a+b,0)} total</div>
          {weekData.every(v => v === 0) ? (
            <div style={{ textAlign:'center', padding:'24px 8px', color:C.muted, fontSize:12 }}>
              No visits yet this week — once customers start scanning, you'll see the pattern here.
            </div>
          ) : (
            <div style={{ display:'flex', alignItems:'flex-end', gap:9, height:100 }}>
              {weekData.map((v,i)=>{
                const pct = (v/maxWeek)*100
                const today = i === todayIdx
                return (
                  <div key={i} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:5, height:'100%' }}>
                    <div style={{ flex:1, width:'100%', display:'flex', alignItems:'flex-end' }}>
                      <div style={{ width:'100%', height:`${pct}%`, background:today?C.amber:'#EAE6E0', borderRadius:'4px 4px 0 0', minHeight: v>0 ? 5 : 0, transition:'height 0.6s' }}/>
                    </div>
                    <div style={{ fontSize:10, color:today?C.amber:C.muted, fontWeight:today?700:400 }}>{WEEK[i]}</div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:14, padding:'18px 16px' }}>
          <div style={{ fontFamily:'Fraunces,serif', fontSize:15, fontWeight:700, color:C.ink, marginBottom:14 }}>Today's activity</div>
          {visits.length === 0 ? (
            <div style={{ textAlign:'center', padding:'20px', color:C.muted, fontSize:13 }}>No visits yet today</div>
          ) : visits.slice(0,5).map((v,i)=>(
            <div key={i} style={{ display:'flex', alignItems:'center', gap:9, marginBottom:11 }}>
              <div style={{ width:32, height:32, borderRadius:'50%', background:C.amberSoft, display:'flex', alignItems:'center', justifyContent:'center', fontSize:15, flexShrink:0 }}>{v.profiles?.avatar||'🧑'}</div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:13, fontWeight:500, color:C.ink, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{v.profiles?.full_name||'Customer'}</div>
                <div style={{ fontSize:11, color:C.muted }}>earned a stamp</div>
              </div>
              <div style={{ fontSize:11, color:C.muted, flexShrink:0 }}>{new Date(v.created_at).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── CUSTOMERS ─────────────────────────────────────────────────────────────────
function Customers({ spot }) {
  const { stats, loading } = useDashboardStats(spot.id)
  const customers = stats?.customers || []
  const [filter, setFilter] = useState('all')

  const filtered = filter === 'all' ? customers
    : filter === 'vip'     ? customers.filter(c=>c.lifetime_visits>=20)
    : filter === 'regular' ? customers.filter(c=>c.lifetime_visits>=5&&c.lifetime_visits<20)
    : customers.filter(c=>c.lifetime_visits<5)

  return (
    <div style={{ animation:'up 0.3s ease' }}>
      <PageHeader eyebrow={`${customers.length} total`} title="Your Customers" sub={`Everyone who's visited ${spot.name}`}/>

      <div style={{ display:'flex', gap:8, marginBottom:20 }}>
        {['all','vip','regular','new'].map(f=>(
          <button key={f} onClick={()=>setFilter(f)} style={{ background:filter===f?C.navy:C.card, color:filter===f?'#fff':C.mid, border:filter===f?'none':`1px solid ${C.border}`, borderRadius:20, padding:'6px 14px', fontSize:13, fontWeight:filter===f?600:400, cursor:'pointer', textTransform:'capitalize', transition:'all 0.15s' }}>
            {f==='all'?'All':f==='vip'?'⭐ VIP':f==='regular'?'Regular':'🆕 New'}
          </button>
        ))}
      </div>

      {loading ? <div style={{ textAlign:'center', padding:'40px', color:C.muted }}>Loading customers…</div> : (
        <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:14, overflow:'hidden' }}>
          <div className="ow-table-row" style={{ padding:'10px 18px', background:'#F9F6F2', borderBottom:`1px solid ${C.border}` }}>
            {['Customer','Visits','Stamps','Last visit'].map(h=>(
              <div key={h} style={{ fontSize:10, fontWeight:600, color:C.muted, textTransform:'uppercase', letterSpacing:'0.07em' }}>{h}</div>
            ))}
          </div>
          {filtered.length === 0 ? (
            <div style={{ textAlign:'center', padding:'40px', color:C.muted, fontSize:14 }}>No customers in this group yet</div>
          ) : filtered.map((c,i)=>(
            <div key={c.user_id} className="ow-table-row" style={{ padding:'13px 18px', borderBottom:i<filtered.length-1?`1px solid ${C.border}`:'none', alignItems:'center' }}>
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <div style={{ width:36, height:36, borderRadius:'50%', background:C.amberSoft, display:'flex', alignItems:'center', justifyContent:'center', fontSize:17, flexShrink:0 }}>{c.avatar||'🧑'}</div>
                <div>
                  <div style={{ fontSize:13, fontWeight:500, color:C.ink }}>{c.full_name||'Anonymous'}</div>
                  <div style={{ fontSize:10, color:C.muted }}>{c.lifetime_visits>=20?'⭐ VIP':c.lifetime_visits>=5?'Regular':'New'}</div>
                </div>
              </div>
              <div style={{ fontSize:14, color:C.ink, fontWeight:500 }}>{c.visit_count}</div>
              <div>
                <div style={{ display:'flex', gap:3, marginBottom:3 }}>
                  {Array.from({length:spot.stamps_required}).map((_,si)=>(
                    <div key={si} style={{ width:7, height:7, borderRadius:'50%', background:si<(c.current_stamps||0)?C.amber:'#E8E3DC' }}/>
                  ))}
                </div>
                <div style={{ fontSize:9, color:C.muted }}>{c.current_stamps||0}/{spot.stamps_required}</div>
              </div>
              <div style={{ fontSize:12, color:C.mid }}>{c.last_visit ? new Date(c.last_visit).toLocaleDateString() : '—'}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── SEND OFFER ────────────────────────────────────────────────────────────────
function SendOfferPage({ spot }) {
  const [message,  setMessage]  = useState('')
  const [target,   setTarget]   = useState('all')
  const [duration, setDuration] = useState(24)   // hours; null = until ended manually
  const { sendOffer, sending, sent } = useSendOffer(spot.id)
  const { offers: liveOffers, endOffer, refetch: refetchOffers } = useLiveOffers(spot.id)
  const [endingId, setEndingId] = useState(null)

  const durations = [
    { id:6,    label:'6 hours',  desc:'Flash promo' },
    { id:24,   label:'Today',    desc:'Ends in 24 hours' },
    { id:72,   label:'3 days',   desc:'Short run' },
    { id:168,  label:'1 week',   desc:'Longer campaign' },
    { id:null, label:'No end date', desc:'Runs until you end it' },
  ]

  async function handleEnd(id) {
    setEndingId(id)
    await endOffer(id)
    setEndingId(null)
  }

  function timeLeft(expiresAt) {
    if (!expiresAt) return 'No end date'
    const ms = new Date(expiresAt) - Date.now()
    if (ms <= 0) return 'Expired'
    const h = Math.floor(ms / 3600000)
    if (h < 1) return `${Math.max(1, Math.floor(ms / 60000))}m left`
    if (h < 24) return `${h}h left`
    return `${Math.floor(h / 24)}d ${h % 24}h left`
  }

  const targets = [
    {id:'all',     label:'All customers',  count:'Everyone', desc:'All followers'},
    {id:'regular', label:'Regulars only',  count:'5+ visits',desc:'Customers with 5+ visits'},
    {id:'lapsed',  label:'Win-back',        count:'2wks+',    desc:"Haven't visited in 2+ weeks"},
    {id:'vip',     label:'VIP only',        count:'20+ visits',desc:'Your top customers'},
  ]

  const templates = [
    '☕ Free coffee with any pastry today only!',
    '🥐 Buy 2, get 1 free — this morning only',
    '🎉 15% off everything before noon today',
    '🍞 Fresh batch just out — come grab one!',
  ]

  if (sent) return (
    <div style={{ animation:'up 0.4s ease' }}>
      <PageHeader eyebrow="Sent" title="Offer delivered!" sub=""/>
      <div style={{ background:C.sageSoft, border:`1px solid ${C.sage}40`, borderRadius:16, padding:'32px', textAlign:'center' }}>
        <div style={{ fontSize:44, marginBottom:12 }}>🎉</div>
        <div style={{ fontFamily:'Fraunces,serif', fontSize:20, fontWeight:700, color:C.ink, marginBottom:6 }}>Your offer is live</div>
        <div style={{ fontSize:14, color:C.mid }}>Customers can see it on Main Street and got a push notification.</div>
        <button onClick={()=>setMessage('')} style={{ marginTop:20, background:C.amber, border:'none', borderRadius:11, padding:'11px 24px', fontSize:14, fontWeight:600, color:C.navy, cursor:'pointer' }}>Send another</button>
      </div>
    </div>
  )

  return (
    <div style={{ animation:'up 0.3s ease' }}>
      <PageHeader eyebrow="Reach your customers" title="Send an Offer" sub="Customers get a push notification instantly"/>

      {/* Currently running */}
      {liveOffers.length > 0 && (
        <div style={{ marginBottom:24 }}>
          <div style={{ fontSize:11, fontWeight:700, color:C.sage, letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:10 }}>
            {liveOffers.length} offer{liveOffers.length===1?'':'s'} running now
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {liveOffers.map(o=>(
              <div key={o.id} style={{ background:C.card, border:`1px solid ${C.sage}55`, borderRadius:13, padding:'13px 15px', display:'flex', alignItems:'center', gap:12, flexWrap:'wrap' }}>
                <span style={{ width:8, height:8, borderRadius:'50%', background:C.sage, flexShrink:0 }}/>
                <div style={{ flex:1, minWidth:180 }}>
                  <div style={{ fontSize:13.5, color:C.ink, fontWeight:500 }}>{o.message}</div>
                  <div style={{ fontSize:11.5, color:C.muted, marginTop:2 }}>
                    {timeLeft(o.expires_at)} · sent {new Date(o.sent_at).toLocaleDateString()}
                  </div>
                </div>
                <button
                  onClick={()=>handleEnd(o.id)}
                  disabled={endingId===o.id}
                  style={{ background:'none', border:`1px solid ${C.border}`, borderRadius:9, padding:'7px 14px', fontSize:12.5, fontWeight:600, color:C.rose, cursor:'pointer', flexShrink:0 }}
                >
                  {endingId===o.id ? 'Ending…' : 'End now'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="ow-offer-grid">
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          {/* Target */}
          <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:15, padding:'18px 18px' }}>
            <div style={{ fontFamily:'Fraunces,serif', fontSize:14, fontWeight:700, color:C.ink, marginBottom:12 }}>Who sees this?</div>
            {targets.map(t=>(
              <label key={t.id} style={{ display:'flex', alignItems:'center', gap:11, padding:'10px 13px', borderRadius:10, border:`2px solid ${target===t.id?C.amber:C.border}`, background:target===t.id?C.amberSoft:'#fff', cursor:'pointer', marginBottom:8, transition:'all 0.15s' }}>
                <input type="radio" name="target" value={t.id} checked={target===t.id} onChange={()=>setTarget(t.id)} style={{ accentColor:C.amber }}/>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13, fontWeight:600, color:C.ink }}>{t.label}</div>
                  <div style={{ fontSize:11, color:C.muted }}>{t.desc}</div>
                </div>
              </label>
            ))}
          </div>

          {/* Message */}
          <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:15, padding:'18px 18px' }}>
            <div style={{ fontFamily:'Fraunces,serif', fontSize:14, fontWeight:700, color:C.ink, marginBottom:10 }}>Your offer</div>
            <textarea value={message} onChange={e=>setMessage(e.target.value)} placeholder="e.g. Buy 2 croissants, get 1 free today!" maxLength={120} style={{ width:'100%', background:C.bg, border:`1px solid ${C.border}`, borderRadius:11, padding:'11px 13px', fontSize:14, color:C.ink, resize:'none', height:80, lineHeight:1.5 }}/>
            <div style={{ fontSize:11, color:C.muted, marginTop:4, marginBottom:12 }}>{message.length}/120 characters</div>
            <div style={{ fontFamily:'Fraunces,serif', fontSize:13, fontWeight:600, color:C.ink, marginBottom:7 }}>Quick templates</div>
            {templates.map((t,i)=>(
              <button key={i} onClick={()=>setMessage(t)} style={{ display:'block', width:'100%', background:C.bg, border:`1px solid ${C.border}`, borderRadius:9, padding:'8px 11px', fontSize:12, color:C.ink, cursor:'pointer', textAlign:'left', marginBottom:6 }}>{t}</button>
            ))}
          </div>

          {/* How long it runs */}
          <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:15, padding:'18px' }}>
            <div style={{ fontFamily:'Fraunces,serif', fontSize:14, fontWeight:700, color:C.ink, marginBottom:4 }}>How long should it run?</div>
            <div style={{ fontSize:11.5, color:C.muted, marginBottom:12 }}>It disappears from customers' apps automatically when it ends.</div>
            <div style={{ display:'flex', flexWrap:'wrap', gap:7 }}>
              {durations.map(d=>(
                <button
                  key={String(d.id)}
                  onClick={()=>setDuration(d.id)}
                  title={d.desc}
                  style={{
                    background: duration===d.id ? C.amberSoft : C.bg,
                    border: `2px solid ${duration===d.id ? C.amber : C.border}`,
                    borderRadius:10, padding:'9px 13px', fontSize:12.5,
                    fontWeight: duration===d.id ? 600 : 400,
                    color: duration===d.id ? '#8A6A00' : C.mid,
                    cursor:'pointer', transition:'all 0.15s',
                  }}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          <button onClick={()=>message.trim()&&sendOffer({message,target,durationHours:duration}).then(refetchOffers)} disabled={!message.trim()||sending} style={{ background:message.trim()&&!sending?C.amber:'#E8E3DC', border:'none', borderRadius:12, padding:'14px', fontSize:14, fontWeight:600, color:message.trim()&&!sending?C.navy:C.muted, cursor:message.trim()&&!sending?'pointer':'default', transition:'all 0.2s', boxShadow:message.trim()?'0 6px 18px rgba(245,166,35,0.3)':'none' }}>
            {sending?'Sending…':'✦ Send offer'}
          </button>
        </div>

        {/* Preview */}
        <div style={{ position:'sticky', top:30 }}>
          <div style={{ fontSize:11, fontWeight:600, color:C.muted, textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:11, textAlign:'center' }}>Preview</div>
          <div style={{ background:C.navy, borderRadius:26, padding:'26px 15px 22px', maxWidth:230, margin:'0 auto', boxShadow:'0 22px 55px rgba(0,0,0,0.18)' }}>
            <div style={{ background:'rgba(255,255,255,0.06)', borderRadius:13, padding:'11px 13px', marginBottom:12 }}>
              <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:7 }}>
                <svg width={16} height={16} viewBox="0 0 32 32" fill="none"><circle cx="16" cy="16" r="16" fill={C.amber}/><path d="M16 7L24 14V25H19V19H13V25H8V14Z" fill={C.navy}/></svg>
                <span style={{ fontSize:10, fontWeight:600, color:'rgba(255,255,255,0.7)' }}>homespot</span>
                <span style={{ fontSize:9, color:'rgba(255,255,255,0.3)', marginLeft:'auto' }}>now</span>
              </div>
              <div style={{ fontSize:11, fontWeight:600, color:'#fff', marginBottom:2 }}>{spot.name}</div>
              <div style={{ fontSize:11, color:'rgba(255,255,255,0.6)', lineHeight:1.4 }}>{message||'Your offer will appear here…'}</div>
            </div>
            <div style={{ background:'rgba(255,255,255,0.06)', borderRadius:11, padding:'11px 13px' }}>
              <div style={{ fontSize:8, fontWeight:700, color:C.rose, letterSpacing:'0.1em', marginBottom:5 }}>DEAL ALERT</div>
              <div style={{ display:'flex', gap:8 }}>
                <div style={{ width:30, height:30, borderRadius:8, background:'rgba(245,166,35,0.2)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14 }}>{spot.emoji}</div>
                <div>
                  <div style={{ fontSize:11, fontWeight:600, color:'#fff' }}>{spot.name}</div>
                  <div style={{ fontSize:10, color:'rgba(255,255,255,0.45)', lineHeight:1.3 }}>{message||'Your offer here…'}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── FEEDBACK ──────────────────────────────────────────────────────────────────
function FeedbackPage({ spot }) {
  const { feedback, loading, markRead } = useOwnerFeedback(spot.id)
  const moods = ['','😐','🙂','😊','🤩']
  const moodColors = ['','#E8956D',C.amber,C.sage,C.sage]
  const moodLabels = ['','Meh','Good','Great','Loved it']
  const unread = feedback.filter(f=>!f.read).length

  return (
    <div style={{ animation:'up 0.3s ease' }}>
      <PageHeader eyebrow={`${unread} unread`} title="Customer Feedback" sub={`What your Homespotters are saying after visiting ${spot.name}`}/>

      {loading ? <div style={{ textAlign:'center', padding:'40px', color:C.muted }}>Loading feedback…</div> : feedback.length === 0 ? (
        <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:14, padding:'48px', textAlign:'center' }}>
          <div style={{ fontSize:36, marginBottom:12 }}>💌</div>
          <div style={{ fontFamily:'Fraunces,serif', fontSize:18, color:C.ink, marginBottom:6 }}>No feedback yet</div>
          <div style={{ fontSize:14, color:C.muted }}>As customers visit and rate their experience, their notes will appear here.</div>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:11 }}>
          {feedback.map(f=>(
            <div key={f.id} style={{ background:C.card, border:`1px solid ${f.read?C.border:C.amberBrd}`, borderRadius:15, padding:'17px 19px', position:'relative' }}>
              {!f.read && <div style={{ position:'absolute', top:15, right:15, width:8, height:8, borderRadius:'50%', background:C.amber }}/>}
              <div style={{ display:'flex', alignItems:'flex-start', gap:11, marginBottom:10 }}>
                <div style={{ width:38, height:38, borderRadius:'50%', background:C.amberSoft, display:'flex', alignItems:'center', justifyContent:'center', fontSize:17, flexShrink:0 }}>{f.profiles?.avatar||'🧑'}</div>
                <div style={{ flex:1 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:2 }}>
                    <span style={{ fontSize:14, fontWeight:600, color:C.ink }}>{f.profiles?.full_name||'Customer'}</span>
                    <span style={{ fontSize:16 }}>{moods[f.mood]}</span>
                    <span style={{ fontSize:10, fontWeight:600, color:moodColors[f.mood], background:`${moodColors[f.mood]}18`, padding:'2px 7px', borderRadius:20 }}>{moodLabels[f.mood]}</span>
                  </div>
                  <div style={{ fontSize:11, color:C.muted }}>{new Date(f.created_at).toLocaleDateString()}</div>
                </div>
              </div>
              {f.note && <div style={{ background:C.bg, borderRadius:10, padding:'11px 13px', marginBottom:11, fontSize:13, color:C.ink, lineHeight:1.5 }}>"{f.note}"</div>}
              {!f.read && <button onClick={()=>markRead(f.id)} style={{ background:'none', border:`1px solid ${C.border}`, borderRadius:9, padding:'6px 13px', fontSize:12, color:C.mid, cursor:'pointer', fontWeight:500 }}>Mark as read</button>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── QR CODE ───────────────────────────────────────────────────────────────────
// ── CREATE SPOT (for owners who signed in but never finished setup) ──────────
const CATEGORIES = ['Bakery','Coffee','Restaurant','Salon','Barbershop','Bookshop','Florist','Gym','Boutique','Auto','Pet care','Other']
const PERK_IDEAS  = ['Free coffee','Free pastry','10% off','Free dessert','$5 off','Free item of choice']
const EMOJIS      = ['🥐','☕','🍕','✂️','📚','🌸','💪','🎨','🛒','🐾','🔧','🏪','🍔','🍣','🧁','🌮','🍷','🎵']

function CreateSpotPage({ onCreated }) {
  const [towns, setTowns] = useState([])
  const [form, setForm] = useState({ name:'', emoji:'🏪', category:'', townId:'', tagline:'', phone:'', address:'', perk:'', stamps:'8' })
  const { createSpot, saving, error } = useManageSpot()
  const [done, setDone] = useState(false)

  useEffect(() => {
    supabase.from('towns').select('id, name, state, active').eq('active', true).order('name')
      .then(({ data }) => setTowns(data || []))
  }, [])

  const update = (k, v) => setForm(p => ({ ...p, [k]: v }))
  const ready = form.name.trim() && form.category && form.townId && form.perk.trim()

  async function handleCreate() {
    const { error: err } = await createSpot({
      town_id:          form.townId,
      name:             form.name,
      emoji:            form.emoji,
      category:         form.category,
      tagline:          form.tagline,
      phone:            form.phone,
      address:          form.address,
      stamps_required:  parseInt(form.stamps),
      perk:             form.perk,
      color:            '#F5A623',
    })
    if (!err) {
      setDone(true)
      setTimeout(() => onCreated(), 1200) // refetches the spot, dashboard takes over
    }
  }

  if (done) return (
    <div style={{ textAlign:'center', padding:'80px 24px', animation:'up 0.3s ease' }}>
      <div style={{ width:64, height:64, borderRadius:'50%', background:`linear-gradient(135deg,${C.amber},#E8956D)`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:28, margin:'0 auto 18px', animation:'pop 0.5s ease' }}>✓</div>
      <div style={{ fontFamily:'Fraunces,serif', fontSize:22, fontWeight:700, color:C.ink }}>You're live!</div>
      <div style={{ fontSize:14, color:C.muted, marginTop:6 }}>Loading your dashboard…</div>
    </div>
  )

  return (
    <div style={{ animation:'up 0.3s ease' }}>
      <PageHeader eyebrow="One-time setup" title="Create your spot" sub="This is the business locals will see and scan into on Homespot" />

      <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:17, padding:'26px', maxWidth:560, display:'flex', flexDirection:'column', gap:18 }}>
        <Field label="Pick an icon">
          <div style={{ display:'flex', flexWrap:'wrap', gap:7 }}>
            {EMOJIS.map(em => (
              <button key={em} onClick={()=>update('emoji', em)} style={{ width:38, height:38, borderRadius:9, fontSize:19, background:form.emoji===em?C.amberSoft:C.bg, border:`2px solid ${form.emoji===em?C.amber:C.border}`, cursor:'pointer', transition:'all 0.15s', transform:form.emoji===em?'scale(1.1)':'scale(1)' }}>{em}</button>
            ))}
          </div>
        </Field>

        <Field label="Business name">
          <SimpleInput value={form.name} onChange={v=>update('name', v)} placeholder="e.g. Rosa's Bakery" />
        </Field>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:13 }}>
          <Field label="Category">
            <select value={form.category} onChange={e=>update('category', e.target.value)} style={{ width:'100%', background:C.bg, border:`1.5px solid ${C.border}`, borderRadius:11, padding:'12px 14px', fontSize:14, color:form.category?C.ink:C.muted, cursor:'pointer' }}>
              <option value="">Select…</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="Town">
            <select value={form.townId} onChange={e=>update('townId', e.target.value)} style={{ width:'100%', background:C.bg, border:`1.5px solid ${C.border}`, borderRadius:11, padding:'12px 14px', fontSize:14, color:form.townId?C.ink:C.muted, cursor:'pointer' }}>
              <option value="">Select…</option>
              {towns.map(t => <option key={t.id} value={t.id}>{t.name}, {t.state}</option>)}
            </select>
          </Field>
        </div>

        <Field label="One-line description" hint="Shown under your name in the app">
          <SimpleInput value={form.tagline} onChange={v=>update('tagline', v)} placeholder="Family-owned since 1987" maxLength={50} />
        </Field>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:13 }}>
          <Field label="Phone (optional)"><SimpleInput type="tel" value={form.phone} onChange={v=>update('phone', v)} placeholder="(555) 000-0000" /></Field>
          <Field label="Address (optional)"><SimpleInput value={form.address} onChange={v=>update('address', v)} placeholder="123 Main St" /></Field>
        </div>

        <div style={{ height:1, background:C.border, margin:'4px 0' }} />

        <Field label="Stamps needed for a perk" hint={`Customers visit ${form.stamps} times to earn a reward`}>
          <div style={{ display:'flex', alignItems:'center', gap:14 }}>
            <input type="range" min={4} max={15} value={form.stamps} onChange={e=>update('stamps', e.target.value)} style={{ flex:1, accentColor:C.amber }} />
            <div style={{ fontFamily:'Fraunces,serif', fontSize:24, fontWeight:700, color:C.amber, minWidth:28 }}>{form.stamps}</div>
          </div>
        </Field>

        <Field label="What do they earn?">
          <SimpleInput value={form.perk} onChange={v=>update('perk', v)} placeholder="e.g. Free pastry of your choice" maxLength={50} />
          <div style={{ display:'flex', flexWrap:'wrap', gap:7, marginTop:9 }}>
            {PERK_IDEAS.map(p => (
              <button key={p} onClick={()=>update('perk', p)} style={{ background:form.perk===p?C.amberSoft:C.bg, border:`1px solid ${form.perk===p?C.amber:C.border}`, borderRadius:20, padding:'5px 12px', fontSize:12, color:form.perk===p?'#8A6A00':C.mid, cursor:'pointer', fontWeight:form.perk===p?600:400 }}>{p}</button>
            ))}
          </div>
        </Field>

        {error && <div style={{ background:'#FEF2F2', border:'1px solid #FECACA', borderRadius:10, padding:'10px 13px', fontSize:13, color:'#DC2626' }}>⚠ {error}</div>}

        <button onClick={handleCreate} disabled={!ready||saving} style={{ background:ready&&!saving?C.amber:'#E8E3DC', border:'none', borderRadius:13, padding:'14px', fontSize:15, fontWeight:600, color:ready&&!saving?C.navy:C.muted, cursor:ready?'pointer':'default', transition:'all 0.2s', boxShadow:ready?'0 6px 20px rgba(245,166,35,0.3)':'none' }}>
          {saving ? 'Going live…' : 'Go live →'}
        </button>
      </div>
    </div>
  )
}

function SimpleInput({ value, onChange, placeholder, type='text', maxLength }) {
  return (
    <input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} maxLength={maxLength}
      style={{ width:'100%', background:C.bg, border:`1.5px solid ${C.border}`, borderRadius:11, padding:'12px 14px', fontSize:14, color:C.ink, fontFamily:'Inter,sans-serif' }} />
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

function QRPage({ spot }) {
  const [copied, setCopied] = useState(false)
  const canvasRef = useRef(null)
  const spotUrl = `${window.location.origin}/scan/${spot.id}`

  useEffect(() => {
    if (!canvasRef.current) return
    import('qrcode').then(QRCode => {
      QRCode.toCanvas(canvasRef.current, spotUrl, {
        width: 560,
        margin: 4,                                        // spec minimum is 4 — anything less and iOS refuses to lock on
        color: { dark: '#000000', light: '#FFFFFFFF' },   // pure black on OPAQUE white; navy-on-transparent was killing contrast
        errorCorrectionLevel: 'M',
      })
    })
  }, [spotUrl])

  function handleDownload() {
    const canvas = canvasRef.current
    if (!canvas) return
    // Render at higher resolution for print quality
    import('qrcode').then(QRCode => {
      const printCanvas = document.createElement('canvas')
      QRCode.toCanvas(printCanvas, spotUrl, {
        width: 1400,
        margin: 4,
        color: { dark: '#000000', light: '#FFFFFFFF' },
        errorCorrectionLevel: 'M',
      }, () => {
        const link = document.createElement('a')
        link.download = `homespot-qr-${spot.name.toLowerCase().replace(/\s+/g,'-')}.png`
        link.href = printCanvas.toDataURL('image/png')
        link.click()
      })
    })
  }

  return (
    <div style={{ animation:'up 0.3s ease' }}>
      <PageHeader
        eyebrow="Tap to earn stamps"
        title="Your Tap Tag"
        sub="Customers tap their phone to a sticker on your counter — a stamp lands instantly. No camera, no aiming."
      />

      {/* ── PRIMARY: NFC tap tag ─────────────────────────────────────── */}
      <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:18, padding:'24px', marginBottom:14 }}>
        <div style={{ display:'flex', alignItems:'center', gap:14 }}>
          <div style={{ width:52, height:52, borderRadius:14, background:`linear-gradient(135deg,${C.amber},#E8956D)`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:24, flexShrink:0 }}>📲</div>
          <div>
            <div style={{ fontFamily:'Fraunces,serif', fontSize:17, fontWeight:700, color:C.ink }}>{spot.name}</div>
            <div style={{ fontSize:12, color:C.muted }}>{spot.towns?.name} · {spot.emoji} · one stamp per customer per day</div>
          </div>
        </div>
      </div>

      <div style={{ background:C.sageSoft, border:`1px solid ${C.sage}50`, borderRadius:14, padding:'16px 18px', marginBottom:34, display:'flex', gap:12 }}>
        <span style={{ fontSize:19, lineHeight:1 }}>✅</span>
        <div>
          <div style={{ fontSize:13.5, fontWeight:600, color:'#3D6B27', marginBottom:3 }}>Your tap sticker is on its way</div>
          <div style={{ fontSize:12.5, color:'#4A7A32', lineHeight:1.55 }}>
            We set up and send you a ready-to-go tap sticker — nothing to configure. Just place it where
            customers check out. They tap their phone to it and a stamp lands on their Spot Card instantly.
          </div>
        </div>
      </div>

      {/* ── FALLBACK: printable QR ───────────────────────────────────── */}
      <div style={{ borderTop:`1px solid ${C.border}`, paddingTop:26 }}>
        <h2 style={{ fontFamily:'Fraunces,serif', fontSize:18, fontWeight:700, color:C.ink, marginBottom:5 }}>Backup: printable QR code</h2>
        <p style={{ fontSize:13, color:C.muted, marginBottom:16, maxWidth:600, lineHeight:1.6 }}>
          Older iPhones (before the XR) and some budget Androids can't read tap stickers. Print this and keep it
          next to your sticker so nobody gets left out — it does exactly the same thing.
        </p>

        <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:15, padding:'18px', display:'flex', gap:20, alignItems:'center', flexWrap:'wrap' }}>
          <div style={{ width:150, height:150, background:'#fff', borderRadius:11, display:'flex', alignItems:'center', justifyContent:'center', border:`1px solid ${C.border}`, flexShrink:0, overflow:'hidden' }}>
            <canvas ref={canvasRef} style={{ width:142, height:142 }}/>
          </div>
          <div style={{ flex:1, minWidth:200 }}>
            <div style={{ fontSize:13, color:C.mid, lineHeight:1.6, marginBottom:13 }}>
              Print at <strong>3×3 inches or larger</strong>. Customers point their normal phone camera at it —
              no app needed — and the stamp lands the same as a tap.
            </div>
            <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
              <button onClick={handleDownload} style={{ background:C.navy, border:'none', borderRadius:10, padding:'10px 18px', fontSize:13, fontWeight:600, color:'#fff', cursor:'pointer' }}>
                ⬇ Download to print
              </button>
              <button onClick={()=>{ navigator.clipboard?.writeText(spotUrl); setCopied(true); setTimeout(()=>setCopied(false),2000) }} style={{ background:copied?C.sage:C.bg, border:`1px solid ${copied?C.sage:C.border}`, borderRadius:10, padding:'10px 18px', fontSize:13, fontWeight:600, color:copied?'#fff':C.mid, cursor:'pointer', transition:'all 0.2s' }}>
                {copied?'✓ Copied':'⎘ Copy link'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── PERK CLAIMS ───────────────────────────────────────────────────────────────
function PerkClaimsPage({ spot }) {
  const { pending, redeemed, loading, markRedeemed } = useSpotRedemptions(spot.id)
  const [busyId, setBusyId] = useState(null)

  async function handleMark(id) {
    setBusyId(id)
    await markRedeemed(id)
    setBusyId(null)
  }

  return (
    <div style={{ animation:'up 0.3s ease' }}>
      <PageHeader
        eyebrow="Owed to customers"
        title="Perk Claims"
        sub="Customers who've filled a Spot Card or claimed an offer. Mark it off once you hand it over."
      />

      <div style={{ display:'flex', gap:12, marginBottom:26 }}>
        {[
          ['Waiting to claim', pending.length,  C.amber, C.amberSoft],
          ['Handed over',      redeemed.length, C.sage,  C.sageSoft],
        ].map(([label, value, color, soft])=>(
          <div key={label} style={{ flex:1, background:C.card, border:`1px solid ${C.border}`, borderRadius:14, padding:'16px 18px' }}>
            <div style={{ width:32, height:32, borderRadius:9, background:soft, display:'flex', alignItems:'center', justifyContent:'center', fontSize:15, marginBottom:9 }}>🎁</div>
            <div style={{ fontFamily:'Fraunces,serif', fontSize:26, fontWeight:700, color }}>{value}</div>
            <div style={{ fontSize:12, color:C.muted }}>{label}</div>
          </div>
        ))}
      </div>

      {loading ? (
        <div style={{ color:C.muted, fontSize:14 }}>Loading…</div>
      ) : pending.length === 0 && redeemed.length === 0 ? (
        <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:15, padding:'46px 24px', textAlign:'center' }}>
          <div style={{ fontSize:34, marginBottom:12 }}>🎁</div>
          <div style={{ fontFamily:'Fraunces,serif', fontSize:17, fontWeight:700, color:C.ink, marginBottom:5 }}>No perks earned yet</div>
          <div style={{ fontSize:13, color:C.muted }}>Once a customer fills their Spot Card, their reward shows up here.</div>
        </div>
      ) : (
        <>
          {pending.length > 0 && (
            <div style={{ marginBottom:28 }}>
              <div style={{ fontSize:11, fontWeight:700, color:C.amber, letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:11 }}>
                Waiting to be claimed
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {pending.map(r=>(
                  <div key={r.id} style={{ background:C.card, border:`1px solid ${C.amberBrd}`, borderRadius:13, padding:'13px 16px', display:'flex', alignItems:'center', gap:13, flexWrap:'wrap' }}>
                    <span style={{ fontSize:20 }}>{r.profiles?.avatar || '🧑'}</span>
                    <div style={{ flex:1, minWidth:170 }}>
                      <div style={{ fontSize:13.5, fontWeight:600, color:C.ink }}>
                        {r.profiles?.full_name || r.profiles?.email || 'A customer'}
                      </div>
                      {r.profiles?.full_name && r.profiles?.email && (
                        <div style={{ fontSize:11.5, color:C.muted }}>{r.profiles.email}</div>
                      )}
                      <div style={{ fontSize:12, color:C.mid, marginTop:1 }}>
                        🎁 {r.reward_text}
                        <span style={{ color:C.muted }}> · {r.type === 'offer' ? 'from an offer' : 'filled their card'} · {new Date(r.earned_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <code style={{ fontFamily:'monospace', fontSize:14, fontWeight:700, letterSpacing:'0.1em', background:C.amberSoft, border:`1px solid ${C.amberBrd}`, borderRadius:8, padding:'6px 11px', color:'#8A6A00', flexShrink:0 }}>
                      {r.code}
                    </code>
                    <button onClick={()=>handleMark(r.id)} disabled={busyId===r.id} style={{ background:C.sage, border:'none', borderRadius:9, padding:'8px 15px', fontSize:12.5, fontWeight:600, color:'#fff', cursor:'pointer', flexShrink:0 }}>
                      {busyId===r.id ? 'Saving…' : '✓ Handed over'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {redeemed.length > 0 && (
            <div>
              <div style={{ fontSize:11, fontWeight:700, color:C.muted, letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:11 }}>
                Already handed over
              </div>
              <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:15, overflow:'hidden' }}>
                {redeemed.slice(0,25).map((r,i)=>(
                  <div key={r.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'11px 16px', borderBottom: i < Math.min(redeemed.length,25)-1 ? `1px solid ${C.border}` : 'none' }}>
                    <span style={{ fontSize:16, opacity:0.6 }}>{r.profiles?.avatar || '🧑'}</span>
                    <div style={{ flex:1, minWidth:0 }}>
                      <span style={{ fontSize:13, color:C.ink }}>{r.profiles?.full_name || r.profiles?.email || 'A customer'}</span>
                      <span style={{ fontSize:12, color:C.muted, marginLeft:8 }}>{r.reward_text}</span>
                    </div>
                    <span style={{ fontSize:11.5, color:C.muted, flexShrink:0 }}>{new Date(r.redeemed_at).toLocaleDateString()}</span>
                    <span style={{ color:C.sage, fontSize:13, flexShrink:0 }}>✓</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ── SETTINGS ──────────────────────────────────────────────────────────────────
const EDIT_CATEGORIES = ['Bakery','Coffee','Restaurant','Salon','Barbershop','Bookshop','Florist','Gym','Boutique','Auto','Pet care','Other']
const EDIT_PERK_IDEAS = ['Free coffee','Free pastry','10% off','Free dessert','$5 off','Free item of choice']
const EDIT_EMOJIS     = ['🥐','☕','🍕','✂️','📚','🌸','💪','🎨','🛒','🐾','🔧','🏪','🍔','🍣','🧁','🌮','🍷','🎵']

// Owners type "rosasbakery.com" as often as the full URL, so accept both.
// Anything that isn't http/https is rejected — a javascript: or data: value here
// would run when a customer taps the link on the public spot page.
function normaliseWebsite(raw) {
  if (!raw) return null
  const trimmed = String(raw).trim()
  if (!trimmed) return null
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
  try {
    const u = new URL(withScheme)
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null
    if (!u.hostname.includes('.')) return null
    return { href: u.href, label: u.hostname.replace(/^www\./, '') }
  } catch {
    return null
  }
}

function SettingsPage({ spot, onSaved }) {
  const { updateSpot, deleteSpot, resetCustomerData, saving, error } = useManageSpot()
  const [f, setF] = useState({
    name:     spot.name || '',
    emoji:    spot.emoji || '🏪',
    category: spot.category || '',
    tagline:  spot.tagline || '',
    phone:    spot.phone || '',
    address:  spot.address || '',
    website:  spot.website || '',
    stamps_required: String(spot.stamps_required ?? 8),
    perk:     spot.perk || '',
  })
  const [savedMsg,  setSavedMsg]  = useState(false)
  const [confirmDel, setConfirmDel] = useState(false)
  const [delText,   setDelText]   = useState('')
  const [pausing,   setPausing]   = useState(false)
  const [confirmReset, setConfirmReset] = useState(false)
  const [resetText,    setResetText]    = useState('')
  const [resetDone,    setResetDone]    = useState(null)

  async function handleReset() {
    const { data, error: err } = await resetCustomerData(spot.id)
    if (err) return
    setConfirmReset(false)
    setResetText('')
    setResetDone(data)
    setTimeout(()=>setResetDone(null), 7000)
    onSaved()
  }

  const up = (k,v) => setF(p => ({ ...p, [k]: v }))
  const stampsChanged = parseInt(f.stamps_required) !== spot.stamps_required

  // Blank is fine (the field is optional); non-blank has to parse.
  const site        = normaliseWebsite(f.website)
  const websiteBad  = !!f.website.trim() && !site

  const ready = f.name.trim() && f.category && f.perk.trim() && !websiteBad

  async function handleSave() {
    if (websiteBad) return
    const { error: err } = await updateSpot(spot.id, {
      ...f,
      // Store the normalised form so the public page and the DB constraint
      // both get a clean https:// URL regardless of what was typed.
      website: site ? site.href : null,
      stamps_required: parseInt(f.stamps_required),
    })
    if (!err) {
      setSavedMsg(true)
      setTimeout(()=>setSavedMsg(false), 2600)
      onSaved()
    }
  }

  async function handlePause() {
    setPausing(true)
    await updateSpot(spot.id, { active: !spot.active })
    setPausing(false)
    onSaved()
  }

  async function handleDelete() {
    const { error: err } = await deleteSpot(spot.id)
    if (!err) window.location.reload()
  }

  return (
    <div style={{ animation:'up 0.3s ease' }}>
      <PageHeader eyebrow="Your business" title="Settings" sub="Update your listing, loyalty card, and reward"/>

      {savedMsg && (
        <div style={{ background:C.sageSoft, border:`1px solid ${C.sage}55`, borderRadius:11, padding:'11px 15px', fontSize:13, color:'#3D6B27', marginBottom:16, fontWeight:500 }}>
          ✓ Saved — customers see the update right away
        </div>
      )}
      {error && (
        <div style={{ background:'#FEF2F2', border:'1px solid #FECACA', borderRadius:11, padding:'11px 15px', fontSize:13, color:'#DC2626', marginBottom:16 }}>
          ⚠ {error}
        </div>
      )}

      <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:17, padding:'24px', maxWidth:580, display:'flex', flexDirection:'column', gap:18, marginBottom:20 }}>
        <Field label="Icon">
          <div style={{ display:'flex', flexWrap:'wrap', gap:7 }}>
            {EDIT_EMOJIS.map(em=>(
              <button key={em} onClick={()=>up('emoji',em)} style={{ width:38, height:38, borderRadius:9, fontSize:19, background:f.emoji===em?C.amberSoft:C.bg, border:`2px solid ${f.emoji===em?C.amber:C.border}`, cursor:'pointer', transition:'all 0.15s' }}>{em}</button>
            ))}
          </div>
        </Field>

        <Field label="Business name">
          <SimpleInput value={f.name} onChange={v=>up('name',v)} placeholder="e.g. Rosa's Bakery"/>
        </Field>

        <Field label="Category">
          <select value={f.category} onChange={e=>up('category',e.target.value)} style={{ width:'100%', background:C.bg, border:`1.5px solid ${C.border}`, borderRadius:11, padding:'12px 14px', fontSize:14, color:C.ink, cursor:'pointer' }}>
            <option value="">Select…</option>
            {EDIT_CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}
          </select>
        </Field>

        <Field label="One-line description">
          <SimpleInput value={f.tagline} onChange={v=>up('tagline',v)} placeholder="Family-owned since 1987" maxLength={50}/>
        </Field>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:13 }}>
          <Field label="Phone"><SimpleInput type="tel" value={f.phone} onChange={v=>up('phone',v)} placeholder="(555) 000-0000"/></Field>
          <Field label="Address"><SimpleInput value={f.address} onChange={v=>up('address',v)} placeholder="123 Main St"/></Field>
        </div>

        <Field label="Website">
          <SimpleInput value={f.website} onChange={v=>up('website',v)} placeholder="rosasbakery.com" maxLength={200}/>
          {websiteBad ? (
            <div style={{ fontSize:12, color:'#DC2626', marginTop:7 }}>
              That doesn't look like a web address. Try something like <strong>rosasbakery.com</strong>.
            </div>
          ) : site ? (
            <div style={{ fontSize:12, color:C.mid, marginTop:7 }}>
              Customers will see a link to <strong style={{ color:C.ink }}>{site.label}</strong> on your page.
            </div>
          ) : (
            <div style={{ fontSize:12, color:C.muted, marginTop:7 }}>
              Optional. Your Facebook or Instagram page works too.
            </div>
          )}
        </Field>

        <div style={{ height:1, background:C.border, margin:'4px 0' }}/>

        <Field label="Stamps needed for a reward">
          <div style={{ display:'flex', alignItems:'center', gap:14 }}>
            <input type="range" min={4} max={15} value={f.stamps_required} onChange={e=>up('stamps_required',e.target.value)} style={{ flex:1, accentColor:C.amber }}/>
            <div style={{ fontFamily:'Fraunces,serif', fontSize:24, fontWeight:700, color:C.amber, minWidth:28 }}>{f.stamps_required}</div>
          </div>
          {stampsChanged && (
            <div style={{ background:C.amberSoft, border:`1px solid ${C.amberBrd}`, borderRadius:9, padding:'9px 12px', fontSize:12, color:'#8A6A00', marginTop:9, lineHeight:1.5 }}>
              ⚠ Customers already collecting stamps will be measured against the new number.
              Anyone who has <strong>already earned</strong> a reward still gets what they earned — that's locked in.
            </div>
          )}
        </Field>

        <Field label="What do they earn?">
          <SimpleInput value={f.perk} onChange={v=>up('perk',v)} placeholder="e.g. Free pastry of your choice" maxLength={50}/>
          <div style={{ display:'flex', flexWrap:'wrap', gap:7, marginTop:9 }}>
            {EDIT_PERK_IDEAS.map(p=>(
              <button key={p} onClick={()=>up('perk',p)} style={{ background:f.perk===p?C.amberSoft:C.bg, border:`1px solid ${f.perk===p?C.amber:C.border}`, borderRadius:20, padding:'5px 12px', fontSize:12, color:f.perk===p?'#8A6A00':C.mid, cursor:'pointer' }}>{p}</button>
            ))}
          </div>
        </Field>

        <button onClick={handleSave} disabled={!ready||saving} style={{ background:ready&&!saving?C.amber:'#E8E3DC', border:'none', borderRadius:12, padding:'13px', fontSize:14.5, fontWeight:600, color:ready&&!saving?C.navy:C.muted, cursor:ready&&!saving?'pointer':'default', transition:'all 0.2s' }}>
          {saving ? 'Saving…' : 'Save changes'}
        </button>
      </div>

      <AccountSection />

      {/* Danger zone */}
      <div style={{ maxWidth:580, border:'1px solid #FECACA', background:'#FFFBFB', borderRadius:17, padding:'20px 22px' }}>
        <div style={{ fontFamily:'Fraunces,serif', fontSize:15, fontWeight:700, color:'#B91C1C', marginBottom:14 }}>Danger zone</div>

        <div style={{ display:'flex', alignItems:'center', gap:14, paddingBottom:15, marginBottom:15, borderBottom:'1px solid #FECACA', flexWrap:'wrap' }}>
          <div style={{ flex:1, minWidth:200 }}>
            <div style={{ fontSize:13.5, fontWeight:600, color:C.ink }}>{spot.active ? 'Pause your listing' : 'Listing is paused'}</div>
            <div style={{ fontSize:12, color:C.muted, lineHeight:1.5 }}>
              {spot.active
                ? 'Hides you from the app. Stamps and rewards are kept — nothing is lost.'
                : 'Customers currently cannot see or find you in the app.'}
            </div>
          </div>
          <button onClick={handlePause} disabled={pausing} style={{ background:spot.active?'none':C.sage, border:spot.active?`1px solid ${C.border}`:'none', borderRadius:9, padding:'9px 16px', fontSize:12.5, fontWeight:600, color:spot.active?C.mid:'#fff', cursor:'pointer', flexShrink:0 }}>
            {pausing ? '…' : spot.active ? 'Pause' : 'Go live again'}
          </button>
        </div>

        {/* Reset customer data */}
        <div style={{ paddingBottom:15, marginBottom:15, borderBottom:'1px solid #FECACA' }}>
          {resetDone && (
            <div style={{ background:C.sageSoft, border:`1px solid ${C.sage}55`, borderRadius:9, padding:'10px 13px', fontSize:12.5, color:'#3D6B27', marginBottom:11, lineHeight:1.5 }}>
              ✓ Cleared {resetDone.visits} visit{resetDone.visits===1?'':'s'}, {resetDone.stamp_cards} stamp card{resetDone.stamp_cards===1?'':'s'}, {resetDone.redemptions} perk{resetDone.redemptions===1?'':'s'}, and {resetDone.feedback} feedback note{resetDone.feedback===1?'':'s'}.
            </div>
          )}

          <div style={{ fontSize:13.5, fontWeight:600, color:C.ink, marginBottom:3 }}>Reset customer data</div>
          <div style={{ fontSize:12, color:C.muted, lineHeight:1.55, marginBottom:12 }}>
            Sets every customer back to zero stamps and clears all visits, earned perks, and feedback.
            Your listing, reward, and tap tag stay exactly as they are — <strong>nothing needs reprinting</strong>.
            Useful for wiping test data, or starting a fresh loyalty season.
          </div>

          {!confirmReset ? (
            <button onClick={()=>setConfirmReset(true)} style={{ background:'none', border:'1px solid #FCA5A5', borderRadius:9, padding:'9px 16px', fontSize:12.5, fontWeight:600, color:'#DC2626', cursor:'pointer' }}>
              Reset customer data
            </button>
          ) : (
            <div>
              <div style={{ fontSize:12.5, color:'#B91C1C', marginBottom:8, lineHeight:1.5 }}>
                This erases every customer's progress at {spot.name} and can't be undone.
                Type <strong>RESET</strong> to confirm:
              </div>
              <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                <input value={resetText} onChange={e=>setResetText(e.target.value)} placeholder="RESET"
                  style={{ flex:1, minWidth:150, background:'#fff', border:'1px solid #FCA5A5', borderRadius:9, padding:'9px 12px', fontSize:13 }}/>
                <button onClick={handleReset} disabled={resetText !== 'RESET' || saving}
                  style={{ background: resetText==='RESET' ? '#DC2626' : '#F3D3D3', border:'none', borderRadius:9, padding:'9px 16px', fontSize:12.5, fontWeight:600, color:'#fff', cursor: resetText==='RESET' ? 'pointer' : 'default', flexShrink:0 }}>
                  {saving ? 'Clearing…' : 'Clear it all'}
                </button>
                <button onClick={()=>{ setConfirmReset(false); setResetText('') }}
                  style={{ background:'none', border:`1px solid ${C.border}`, borderRadius:9, padding:'9px 14px', fontSize:12.5, color:C.mid, cursor:'pointer', flexShrink:0 }}>
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        <div style={{ fontSize:13.5, fontWeight:600, color:C.ink, marginBottom:3 }}>Delete this business</div>
        <div style={{ fontSize:12, color:C.muted, lineHeight:1.55, marginBottom:12 }}>
          Permanently removes your listing and <strong>every customer's stamps, rewards, and history</strong> with it.
          This cannot be undone. If you just want to close temporarily, pause instead.
        </div>

        {!confirmDel ? (
          <button onClick={()=>setConfirmDel(true)} style={{ background:'none', border:'1px solid #FCA5A5', borderRadius:9, padding:'9px 16px', fontSize:12.5, fontWeight:600, color:'#DC2626', cursor:'pointer' }}>
            Delete business
          </button>
        ) : (
          <div>
            <div style={{ fontSize:12.5, color:'#B91C1C', marginBottom:8 }}>
              Type <strong>{spot.name}</strong> to confirm:
            </div>
            <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
              <input value={delText} onChange={e=>setDelText(e.target.value)} placeholder={spot.name}
                style={{ flex:1, minWidth:180, background:'#fff', border:'1px solid #FCA5A5', borderRadius:9, padding:'9px 12px', fontSize:13 }}/>
              <button onClick={handleDelete} disabled={delText !== spot.name || saving}
                style={{ background: delText===spot.name ? '#DC2626' : '#F3D3D3', border:'none', borderRadius:9, padding:'9px 16px', fontSize:12.5, fontWeight:600, color:'#fff', cursor: delText===spot.name ? 'pointer' : 'default', flexShrink:0 }}>
                {saving ? 'Deleting…' : 'Delete forever'}
              </button>
              <button onClick={()=>{ setConfirmDel(false); setDelText('') }}
                style={{ background:'none', border:`1px solid ${C.border}`, borderRadius:9, padding:'9px 14px', fontSize:12.5, color:C.mid, cursor:'pointer', flexShrink:0 }}>
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── ACCOUNT (email + password) ────────────────────────────────────────────────
function AccountSection() {
  const { session, updateEmail, updatePassword, authProvider } = useAuth()
  const isGoogle = authProvider === 'google'

  const [email,   setEmail]   = useState('')
  const [curPw,   setCurPw]   = useState('')
  const [newPw,   setNewPw]   = useState('')
  const [confPw,  setConfPw]  = useState('')
  const [busy,    setBusy]    = useState(null)   // 'email' | 'password'
  const [msg,     setMsg]     = useState(null)   // { kind:'ok'|'err', text }

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
    if (newPw.length < 8)   return flash('err', 'New password must be at least 8 characters.')
    if (newPw !== confPw)   return flash('err', "New passwords don't match.")
    if (!curPw)             return flash('err', 'Enter your current password.')

    setBusy('password')
    const { error } = await updatePassword({ currentPassword: curPw, newPassword: newPw })
    setBusy(null)
    if (error) return flash('err', error.message)
    setCurPw(''); setNewPw(''); setConfPw('')
    flash('ok', 'Password updated.')
  }

  return (
    <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:17, padding:'24px', maxWidth:580, marginBottom:20 }}>
      <div style={{ fontFamily:'Fraunces,serif', fontSize:16, fontWeight:700, color:C.ink, marginBottom:4 }}>Account</div>
      <div style={{ fontSize:12.5, color:C.muted, marginBottom:18 }}>
        Signed in as <strong style={{ color:C.ink }}>{session?.user?.email}</strong>
        {isGoogle && <span style={{ marginLeft:7, fontSize:11, background:C.bg, border:`1px solid ${C.border}`, borderRadius:20, padding:'2px 8px' }}>via Google</span>}
      </div>

      {msg && (
        <div style={{
          background: msg.kind==='ok' ? C.sageSoft : '#FEF2F2',
          border: `1px solid ${msg.kind==='ok' ? C.sage+'55' : '#FECACA'}`,
          borderRadius:10, padding:'11px 14px', fontSize:12.5, lineHeight:1.5,
          color: msg.kind==='ok' ? '#3D6B27' : '#DC2626', marginBottom:16,
        }}>
          {msg.kind==='ok' ? '✓ ' : '⚠ '}{msg.text}
        </div>
      )}

      {isGoogle ? (
        <div style={{ background:C.bg, border:`1px solid ${C.border}`, borderRadius:11, padding:'14px 16px', fontSize:12.5, color:C.mid, lineHeight:1.6 }}>
          You sign in with Google, so your email and password are managed there — Homespot never sees them.
          To change either, update your Google account.
        </div>
      ) : (
        <>
          {/* Email */}
          <Field label="Change email">
            <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
              <input
                type="email" value={email} onChange={e=>setEmail(e.target.value)}
                placeholder="new@email.com"
                style={{ flex:1, minWidth:190, background:C.bg, border:`1.5px solid ${C.border}`, borderRadius:11, padding:'11px 13px', fontSize:14, color:C.ink }}
              />
              <button onClick={handleEmail} disabled={busy==='email'}
                style={{ background:C.navy, border:'none', borderRadius:10, padding:'11px 18px', fontSize:13, fontWeight:600, color:'#fff', cursor:'pointer', flexShrink:0 }}>
                {busy==='email' ? 'Sending…' : 'Update'}
              </button>
            </div>
            <div style={{ fontSize:11.5, color:C.muted, marginTop:6 }}>
              We'll email the new address a confirmation link. Nothing changes until you click it.
            </div>
          </Field>

          <div style={{ height:1, background:C.border, margin:'18px 0' }}/>

          {/* Password */}
          <Field label="Change password">
            <div style={{ display:'flex', flexDirection:'column', gap:9 }}>
              <input type="password" value={curPw} onChange={e=>setCurPw(e.target.value)} placeholder="Current password" autoComplete="current-password"
                style={{ background:C.bg, border:`1.5px solid ${C.border}`, borderRadius:11, padding:'11px 13px', fontSize:14, color:C.ink }}/>
              <input type="password" value={newPw} onChange={e=>setNewPw(e.target.value)} placeholder="New password (8+ characters)" autoComplete="new-password"
                style={{ background:C.bg, border:`1.5px solid ${C.border}`, borderRadius:11, padding:'11px 13px', fontSize:14, color:C.ink }}/>
              <input type="password" value={confPw} onChange={e=>setConfPw(e.target.value)} placeholder="Confirm new password" autoComplete="new-password"
                style={{ background:C.bg, border:`1.5px solid ${confPw && newPw !== confPw ? '#FCA5A5' : C.border}`, borderRadius:11, padding:'11px 13px', fontSize:14, color:C.ink }}/>
              <button onClick={handlePassword} disabled={busy==='password'}
                style={{ background:C.navy, border:'none', borderRadius:10, padding:'11px', fontSize:13, fontWeight:600, color:'#fff', cursor:'pointer' }}>
                {busy==='password' ? 'Updating…' : 'Update password'}
              </button>
            </div>
          </Field>
        </>
      )}
    </div>
  )
}
