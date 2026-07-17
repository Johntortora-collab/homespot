import { useState } from 'react'
import { useAuth } from '../lib/AuthContext'
import { useAdminTowns, useAdminSpots, useIsAdmin, useAdminOverview, useAdminUsers, useAdminOffers, useAdminFeedback } from '../lib/hooks'

const C = {
  bg:'#FDF8F2', card:'#FFFFFF', navy:'#1A1A2E',
  amber:'#F5A623', amberSoft:'#FEF3DC', amberBrd:'rgba(245,166,35,0.3)',
  sage:'#7BA05B', sageSoft:'#EDF4E8',
  rose:'#E8956D',
  ink:'#1A1A2E', mid:'#6B7280', muted:'#9CA3AF', border:'#E8E3DC',
}

const STATES = ['NJ','NY','CT','PA','MA','CA','TX','FL','IL','OH']
const EMOJI_OPTIONS = ['📍','🏘️','🌳','🌸','🍁','🌿','⛰️','🎨','🏡','🌊','🏖️','🏞️','🌆']

export default function AdminTowns() {
  const { profile } = useAuth()
  const isAdmin = useIsAdmin()
  const [tab, setTab] = useState('overview')

  if (!profile) return null
  if (!isAdmin) return (
    <div style={{ minHeight:'100vh', background:C.bg, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'Inter,sans-serif' }}>
      <div style={{ textAlign:'center' }}>
        <div style={{ fontSize:40, marginBottom:12 }}>🔒</div>
        <div style={{ fontFamily:'Fraunces,serif', fontSize:20, color:C.ink }}>Admin access only</div>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight:'100vh', background:C.bg, fontFamily:'Inter,sans-serif', color:C.ink }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,600;0,9..144,700&family=Inter:wght@400;500;600&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        input,select{outline:none;font-family:inherit}
        button{font-family:inherit;cursor:pointer}
        @keyframes up{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
      `}</style>

      <div style={{ background:C.navy, padding:'18px 32px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <svg width={24} height={24} viewBox="0 0 32 32"><circle cx="16" cy="16" r="16" fill={C.amber}/><path d="M16 7L24 14V25H19V19H13V25H8V14Z" fill={C.navy}/></svg>
          <span style={{ fontFamily:'Fraunces,serif', fontSize:17, fontWeight:700, color:'#fff' }}>home<span style={{ color:C.amber }}>spot</span> admin</span>
        </div>
        <span style={{ fontSize:12, color:'rgba(255,255,255,0.4)' }}>{profile.full_name}</span>
      </div>

      <div style={{ maxWidth:880, margin:'0 auto', padding:'24px 24px 0' }}>
        <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
          {[['overview','Overview'],['users','Users'],['towns','Towns'],['businesses','Businesses'],['offers','Offers'],['feedback','Feedback']].map(([id, label]) => (
            <button key={id} onClick={()=>setTab(id)} style={{ background: tab===id ? C.navy : C.card, color: tab===id ? '#fff' : C.mid, border: tab===id ? 'none' : `1px solid ${C.border}`, borderRadius:20, padding:'8px 18px', fontSize:13, fontWeight:600 }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {tab === 'overview'   && <OverviewPanel />}
      {tab === 'users'      && <UsersPanel />}
      {tab === 'towns'      && <TownsPanel />}
      {tab === 'businesses' && <BusinessesPanel />}
      {tab === 'offers'     && <OffersPanel />}
      {tab === 'feedback'   && <FeedbackPanel />}
    </div>
  )
}

function TownsPanel() {
  const { towns, requests, loading, addTown, toggleTownActive, deleteTown, markRequestStatus } = useAdminTowns()
  const [form, setForm] = useState({ name:'', state:'NJ', emoji:'📍', population:'' })
  const [saving, setSaving] = useState(false)
  const [justAdded, setJustAdded] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)
  const [deleteError, setDeleteError] = useState('')


  const update = (k, v) => setForm(p => ({ ...p, [k]: v }))
  const ready = form.name.trim() && form.state && form.population.trim()

  async function handleAdd() {
    setSaving(true)
    const { error } = await addTown(form)
    setSaving(false)
    if (!error) {
      setForm({ name:'', state:'NJ', emoji:'📍', population:'' })
      setJustAdded(true)
      setTimeout(() => setJustAdded(false), 2400)
    }
  }

  async function handleAddFromRequest(req) {
    setSaving(true)
    await addTown({ name: req.town_name, state: req.state || 'NJ', emoji: '📍', population: '—' })
    await markRequestStatus(req.id, 'added')
    setSaving(false)
  }

  async function handleDelete(townId) {
    setDeleteError('')
    setSaving(true)
    const { error } = await deleteTown(townId)
    setSaving(false)
    setConfirmDeleteId(null)
    if (error) {
      setDeleteError(error.message)
      setTimeout(() => setDeleteError(''), 5000)
    }
  }

  const pendingRequests = requests.filter(r => r.status === 'pending')

  return (
    <div style={{ maxWidth:880, margin:'0 auto', padding:'32px 24px 60px' }}>
        <h1 style={{ fontFamily:'Fraunces,serif', fontSize:28, fontWeight:700, marginBottom:6 }}>Manage Towns</h1>
        <p style={{ fontSize:14, color:C.muted, marginBottom:32 }}>Add new towns instantly, or approve ones people have requested.</p>

        {/* Pending requests */}
        {pendingRequests.length > 0 && (
          <div style={{ marginBottom:32 }}>
            <div style={{ fontSize:11, fontWeight:700, color:C.amber, letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:12 }}>
              {pendingRequests.length} town{pendingRequests.length!==1?'s':''} requested
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {pendingRequests.map(req => (
                <div key={req.id} style={{ background:C.card, border:`1px solid ${C.amberBrd}`, borderRadius:13, padding:'14px 16px', display:'flex', alignItems:'center', gap:14 }}>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:14, fontWeight:600 }}>{req.town_name}{req.state ? `, ${req.state}` : ''}</div>
                    <div style={{ fontSize:12, color:C.muted }}>
                      Requested by {req.profiles?.full_name || 'someone'} · {new Date(req.created_at).toLocaleDateString()}
                      {req.note && <> — "{req.note}"</>}
                    </div>
                  </div>
                  <button onClick={()=>handleAddFromRequest(req)} disabled={saving} style={{ background:C.amber, border:'none', borderRadius:9, padding:'8px 16px', fontSize:13, fontWeight:600, color:C.navy }}>Add town</button>
                  <button onClick={()=>markRequestStatus(req.id, 'declined')} style={{ background:'none', border:`1px solid ${C.border}`, borderRadius:9, padding:'8px 14px', fontSize:13, color:C.mid }}>Decline</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Add new town form */}
        <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:17, padding:24, marginBottom:32 }}>
          <div style={{ fontFamily:'Fraunces,serif', fontSize:17, fontWeight:700, marginBottom:16 }}>Add a new town</div>

          {justAdded && (
            <div style={{ background:C.sageSoft, border:`1px solid ${C.sage}40`, borderRadius:10, padding:'10px 14px', fontSize:13, color:'#3D6B27', marginBottom:14 }}>
              ✓ Town added and live immediately
            </div>
          )}

          <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr', gap:12, marginBottom:14 }}>
            <div>
              <label style={{ fontSize:12, fontWeight:600, color:C.mid, display:'block', marginBottom:5 }}>Town name</label>
              <input value={form.name} onChange={e=>update('name', e.target.value)} placeholder="e.g. Hoboken" style={{ width:'100%', background:C.bg, border:`1px solid ${C.border}`, borderRadius:10, padding:'10px 12px', fontSize:14 }} />
            </div>
            <div>
              <label style={{ fontSize:12, fontWeight:600, color:C.mid, display:'block', marginBottom:5 }}>State</label>
              <select value={form.state} onChange={e=>update('state', e.target.value)} style={{ width:'100%', background:C.bg, border:`1px solid ${C.border}`, borderRadius:10, padding:'10px 12px', fontSize:14 }}>
                {STATES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize:12, fontWeight:600, color:C.mid, display:'block', marginBottom:5 }}>Population</label>
              <input value={form.population} onChange={e=>update('population', e.target.value)} placeholder="e.g. 50k" style={{ width:'100%', background:C.bg, border:`1px solid ${C.border}`, borderRadius:10, padding:'10px 12px', fontSize:14 }} />
            </div>
          </div>

          <div style={{ marginBottom:16 }}>
            <label style={{ fontSize:12, fontWeight:600, color:C.mid, display:'block', marginBottom:7 }}>Icon</label>
            <div style={{ display:'flex', gap:7, flexWrap:'wrap' }}>
              {EMOJI_OPTIONS.map(em => (
                <button key={em} onClick={()=>update('emoji', em)} style={{ width:36, height:36, borderRadius:9, fontSize:17, background:form.emoji===em?C.amberSoft:C.bg, border:`2px solid ${form.emoji===em?C.amber:C.border}` }}>{em}</button>
              ))}
            </div>
          </div>

          <button onClick={handleAdd} disabled={!ready||saving} style={{ background:ready&&!saving?C.amber:'#E8E3DC', border:'none', borderRadius:11, padding:'12px 24px', fontSize:14, fontWeight:600, color:ready&&!saving?C.navy:C.muted }}>
            {saving ? 'Adding…' : '+ Add town'}
          </button>
        </div>

        {/* Existing towns list */}
        <div style={{ fontFamily:'Fraunces,serif', fontSize:17, fontWeight:700, marginBottom:14 }}>All towns ({towns.length})</div>

        {deleteError && (
          <div style={{ background:'#FEF2F2', border:'1px solid #FECACA', borderRadius:10, padding:'11px 14px', fontSize:13, color:'#DC2626', marginBottom:14 }}>
            ⚠ {deleteError}
          </div>
        )}

        {loading ? (
          <div style={{ color:C.muted, fontSize:14 }}>Loading…</div>
        ) : (
          <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:15, overflow:'hidden' }}>
            {towns.map((t, i) => (
              <div key={t.id} style={{ display:'flex', alignItems:'center', gap:14, padding:'13px 18px', borderBottom: i<towns.length-1 ? `1px solid ${C.border}` : 'none' }}>
                <span style={{ fontSize:20 }}>{t.emoji}</span>
                <div style={{ flex:1 }}>
                  <span style={{ fontSize:14, fontWeight:600 }}>{t.name}</span>
                  <span style={{ fontSize:12, color:C.muted, marginLeft:8 }}>{t.state} · {t.population} residents</span>
                </div>

                {confirmDeleteId === t.id ? (
                  <>
                    <span style={{ fontSize:12, color:C.rose, fontWeight:600 }}>Delete {t.name}?</span>
                    <button onClick={()=>handleDelete(t.id)} disabled={saving} style={{ background:'#DC2626', border:'none', borderRadius:9, padding:'6px 13px', fontSize:12, fontWeight:600, color:'#fff' }}>
                      {saving ? 'Deleting…' : 'Yes, delete'}
                    </button>
                    <button onClick={()=>setConfirmDeleteId(null)} style={{ background:'none', border:`1px solid ${C.border}`, borderRadius:9, padding:'6px 13px', fontSize:12, color:C.mid }}>
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={()=>toggleTownActive(t.id, !t.active)}
                      style={{
                        background: t.active ? C.sageSoft : C.bg,
                        border: `1px solid ${t.active ? C.sage+'60' : C.border}`,
                        borderRadius: 20, padding: '5px 13px', fontSize: 12, fontWeight: 600,
                        color: t.active ? '#3D6B27' : C.muted,
                      }}
                    >
                      {t.active ? '● Active' : 'Coming soon'}
                    </button>
                    <button
                      onClick={()=>setConfirmDeleteId(t.id)}
                      title="Delete town"
                      style={{ background:'none', border:`1px solid ${C.border}`, borderRadius:9, width:32, height:32, display:'flex', alignItems:'center', justifyContent:'center', color:C.rose, fontSize:14 }}
                    >
                      🗑
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
    </div>
  )
}

function BusinessesPanel() {
  const { spots, loading, deleteSpot } = useAdminSpots()
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const [q, setQ] = useState('')

  const filtered = spots.filter(s =>
    s.name.toLowerCase().includes(q.toLowerCase()) ||
    s.towns?.name?.toLowerCase().includes(q.toLowerCase()) ||
    s.category?.toLowerCase().includes(q.toLowerCase())
  )

  async function handleDelete(spotId) {
    setDeleting(true)
    const { error } = await deleteSpot(spotId)
    setDeleting(false)
    setConfirmDeleteId(null)
    if (error) {
      setDeleteError(error.message)
      setTimeout(() => setDeleteError(''), 5000)
    }
  }

  return (
    <div style={{ maxWidth:880, margin:'0 auto', padding:'32px 24px 60px' }}>
      <h1 style={{ fontFamily:'Fraunces,serif', fontSize:28, fontWeight:700, marginBottom:6 }}>Manage Businesses</h1>
      <p style={{ fontSize:14, color:C.muted, marginBottom:24 }}>Every business currently listed on Homespot. Deleting one removes its stamps, visits, offers, and feedback permanently.</p>

      <input
        value={q}
        onChange={e=>setQ(e.target.value)}
        placeholder="Search by name, town, or category…"
        style={{ width:'100%', background:C.card, border:`1px solid ${C.border}`, borderRadius:12, padding:'11px 14px', fontSize:14, marginBottom:18 }}
      />

      {deleteError && (
        <div style={{ background:'#FEF2F2', border:'1px solid #FECACA', borderRadius:10, padding:'11px 14px', fontSize:13, color:'#DC2626', marginBottom:14 }}>
          ⚠ {deleteError}
        </div>
      )}

      {loading ? (
        <div style={{ color:C.muted, fontSize:14 }}>Loading…</div>
      ) : filtered.length === 0 ? (
        <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:15, padding:'40px', textAlign:'center', color:C.muted, fontSize:14 }}>
          {spots.length === 0 ? 'No businesses have been created yet.' : 'No matches for that search.'}
        </div>
      ) : (
        <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:15, overflow:'hidden' }}>
          {filtered.map((s, i) => (
            <div key={s.id} style={{ display:'flex', alignItems:'center', gap:14, padding:'13px 18px', borderBottom: i<filtered.length-1 ? `1px solid ${C.border}` : 'none' }}>
              <span style={{ fontSize:22 }}>{s.emoji}</span>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:14, fontWeight:600 }}>{s.name}</div>
                <div style={{ fontSize:12, color:C.muted }}>
                  {s.category} · {s.towns?.name}, {s.towns?.state} · owner: {s.profiles?.full_name || 'unknown'}
                </div>
              </div>

              {confirmDeleteId === s.id ? (
                <>
                  <span style={{ fontSize:12, color:C.rose, fontWeight:600, whiteSpace:'nowrap' }}>Delete {s.name}?</span>
                  <button onClick={()=>handleDelete(s.id)} disabled={deleting} style={{ background:'#DC2626', border:'none', borderRadius:9, padding:'6px 13px', fontSize:12, fontWeight:600, color:'#fff', flexShrink:0 }}>
                    {deleting ? 'Deleting…' : 'Yes, delete'}
                  </button>
                  <button onClick={()=>setConfirmDeleteId(null)} style={{ background:'none', border:`1px solid ${C.border}`, borderRadius:9, padding:'6px 13px', fontSize:12, color:C.mid, flexShrink:0 }}>
                    Cancel
                  </button>
                </>
              ) : (
                <button
                  onClick={()=>setConfirmDeleteId(s.id)}
                  title="Delete business"
                  style={{ background:'none', border:`1px solid ${C.border}`, borderRadius:9, width:32, height:32, display:'flex', alignItems:'center', justifyContent:'center', color:C.rose, fontSize:14, flexShrink:0 }}
                >
                  🗑
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── OVERVIEW ──────────────────────────────────────────────────────────────────
function OverviewPanel() {
  const { stats, loading } = useAdminOverview()

  if (loading) return <div style={{ maxWidth:880, margin:'0 auto', padding:'32px 24px', color:C.muted }}>Loading…</div>
  if (!stats)  return <div style={{ maxWidth:880, margin:'0 auto', padding:'32px 24px', color:C.rose }}>Couldn't load stats.</div>

  const cards = [
    ['People', [
      ['Total users', stats.total_users],
      ['Customers', stats.consumers],
      ['Owners', stats.owners],
    ]],
    ['Places', [
      ['Active towns', stats.towns_active],
      ['Businesses', stats.businesses],
      ['Live now', stats.businesses_live],
    ]],
    ['Activity', [
      ['Total scans', stats.scans_total],
      ['Scans (7 days)', stats.scans_7d],
      ['Live offers', stats.offers_live],
    ]],
    ['Perks', [
      ['Earned', stats.perks_earned],
      ['Redeemed', stats.perks_redeemed],
      ['Town requests', stats.town_requests],
    ]],
  ]

  return (
    <div style={{ maxWidth:880, margin:'0 auto', padding:'32px 24px 60px' }}>
      <h1 style={{ fontFamily:'Fraunces,serif', fontSize:28, fontWeight:700, marginBottom:6 }}>Pilot Overview</h1>
      <p style={{ fontSize:14, color:C.muted, marginBottom:28 }}>Everything happening across Homespot at a glance.</p>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:14 }}>
        {cards.map(([group, rows]) => (
          <div key={group} style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:15, padding:'18px 20px' }}>
            <div style={{ fontSize:11, fontWeight:700, color:C.amber, letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:13 }}>{group}</div>
            {rows.map(([label, value], i) => (
              <div key={label} style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom: i < rows.length-1 ? 9 : 0 }}>
                <span style={{ fontSize:13, color:C.mid }}>{label}</span>
                <span style={{ fontFamily:'Fraunces,serif', fontSize:20, fontWeight:700, color:C.ink }}>{value}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── USERS ─────────────────────────────────────────────────────────────────────
function UsersPanel() {
  const { users, loading, setRole } = useAdminUsers()
  const [q, setQ] = useState('')
  const [busyId, setBusyId] = useState(null)

  const filtered = users.filter(u =>
    (u.full_name || '').toLowerCase().includes(q.toLowerCase()) ||
    (u.email || '').toLowerCase().includes(q.toLowerCase()) ||
    (u.town_name || '').toLowerCase().includes(q.toLowerCase())
  )

  async function toggleRole(u) {
    setBusyId(u.id)
    await setRole(u.id, u.role === 'owner' ? 'consumer' : 'owner')
    setBusyId(null)
  }

  return (
    <div style={{ maxWidth:880, margin:'0 auto', padding:'32px 24px 60px' }}>
      <h1 style={{ fontFamily:'Fraunces,serif', fontSize:28, fontWeight:700, marginBottom:6 }}>Users ({users.length})</h1>
      <p style={{ fontSize:14, color:C.muted, marginBottom:20 }}>Everyone who's signed up. Switch someone between customer and business owner here.</p>

      <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search name, email, or town…"
        style={{ width:'100%', background:C.card, border:`1px solid ${C.border}`, borderRadius:12, padding:'11px 14px', fontSize:14, marginBottom:18 }}/>

      {loading ? <div style={{ color:C.muted }}>Loading…</div> : (
        <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:15, overflow:'hidden' }}>
          {filtered.map((u, i) => (
            <div key={u.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'13px 16px', borderBottom: i<filtered.length-1 ? `1px solid ${C.border}` : 'none', flexWrap:'wrap' }}>
              <div style={{ flex:1, minWidth:180 }}>
                <div style={{ fontSize:13.5, fontWeight:600 }}>
                  {u.full_name || u.email || 'Unnamed'}
                  {u.is_admin && <span style={{ marginLeft:7, fontSize:10, fontWeight:700, color:C.amber, background:C.amberSoft, borderRadius:20, padding:'1px 7px' }}>ADMIN</span>}
                </div>
                <div style={{ fontSize:12, color:C.muted }}>
                  {u.email && `${u.email} · `}{u.town_name || 'no town'} · {u.visit_count} scan{u.visit_count===1?'':'s'} · joined {new Date(u.created_at).toLocaleDateString()}
                </div>
              </div>
              <span style={{ fontSize:11, fontWeight:700, borderRadius:20, padding:'3px 10px', color: u.role==='owner' ? '#8A6A00' : C.mid, background: u.role==='owner' ? C.amberSoft : C.bg, border:`1px solid ${u.role==='owner'?C.amberBrd:C.border}` }}>
                {u.role}
              </span>
              <button onClick={()=>toggleRole(u)} disabled={busyId===u.id || u.is_admin}
                title={u.is_admin ? "Can't change an admin's role here" : ''}
                style={{ background:'none', border:`1px solid ${C.border}`, borderRadius:9, padding:'7px 12px', fontSize:12, fontWeight:600, color: u.is_admin ? C.muted : C.navy, cursor: u.is_admin ? 'default' : 'pointer', flexShrink:0 }}>
                {busyId===u.id ? '…' : u.role==='owner' ? 'Make customer' : 'Make owner'}
              </button>
            </div>
          ))}
          {filtered.length === 0 && <div style={{ padding:'30px', textAlign:'center', color:C.muted, fontSize:14 }}>No matches.</div>}
        </div>
      )}
    </div>
  )
}

// ── OFFERS ────────────────────────────────────────────────────────────────────
function OffersPanel() {
  const { offers, loading, endOffer } = useAdminOffers()
  const [busyId, setBusyId] = useState(null)

  function isLive(o) {
    return o.active && (!o.expires_at || new Date(o.expires_at) > new Date())
  }

  async function handleEnd(id) {
    setBusyId(id); await endOffer(id); setBusyId(null)
  }

  return (
    <div style={{ maxWidth:880, margin:'0 auto', padding:'32px 24px 60px' }}>
      <h1 style={{ fontFamily:'Fraunces,serif', fontSize:28, fontWeight:700, marginBottom:6 }}>Offers</h1>
      <p style={{ fontSize:14, color:C.muted, marginBottom:20 }}>Every promotion across all businesses. End any that shouldn't be running.</p>

      {loading ? <div style={{ color:C.muted }}>Loading…</div> : offers.length === 0 ? (
        <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:15, padding:'40px', textAlign:'center', color:C.muted }}>No offers have been sent yet.</div>
      ) : (
        <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:15, overflow:'hidden' }}>
          {offers.map((o, i) => {
            const live = isLive(o)
            return (
              <div key={o.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'13px 16px', borderBottom: i<offers.length-1 ? `1px solid ${C.border}` : 'none', flexWrap:'wrap', opacity: live ? 1 : 0.55 }}>
                <span style={{ width:8, height:8, borderRadius:'50%', background: live ? C.sage : C.muted, flexShrink:0 }}/>
                <div style={{ flex:1, minWidth:180 }}>
                  <div style={{ fontSize:13.5, color:C.ink }}>{o.message}</div>
                  <div style={{ fontSize:12, color:C.muted }}>{o.spot_name} · {o.town_name} · {new Date(o.sent_at).toLocaleDateString()}</div>
                </div>
                {live ? (
                  <button onClick={()=>handleEnd(o.id)} disabled={busyId===o.id}
                    style={{ background:'none', border:`1px solid ${C.border}`, borderRadius:9, padding:'7px 13px', fontSize:12, fontWeight:600, color:C.rose, cursor:'pointer', flexShrink:0 }}>
                    {busyId===o.id ? '…' : 'End now'}
                  </button>
                ) : (
                  <span style={{ fontSize:11, color:C.muted, flexShrink:0 }}>ended</span>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── FEEDBACK ──────────────────────────────────────────────────────────────────
function FeedbackPanel() {
  const { feedback, loading } = useAdminFeedback()
  const moods = ['', '😞', '😐', '🙂', '😍']  // mood is 1–4

  return (
    <div style={{ maxWidth:880, margin:'0 auto', padding:'32px 24px 60px' }}>
      <h1 style={{ fontFamily:'Fraunces,serif', fontSize:28, fontWeight:700, marginBottom:6 }}>Feedback</h1>
      <p style={{ fontSize:14, color:C.muted, marginBottom:20 }}>What customers have said across every business.</p>

      {loading ? <div style={{ color:C.muted }}>Loading…</div> : feedback.length === 0 ? (
        <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:15, padding:'40px', textAlign:'center', color:C.muted }}>No feedback yet.</div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {feedback.map(f => (
            <div key={f.id} style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:13, padding:'13px 16px', display:'flex', gap:12, alignItems:'flex-start' }}>
              <span style={{ fontSize:22, flexShrink:0 }}>{moods[f.mood] || '•'}</span>
              <div style={{ flex:1 }}>
                {f.note && <div style={{ fontSize:13.5, color:C.ink, marginBottom:3 }}>{f.note}</div>}
                <div style={{ fontSize:12, color:C.muted }}>{f.spot_name} · {new Date(f.created_at).toLocaleDateString()}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
