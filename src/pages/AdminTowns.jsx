import { useState, useMemo } from 'react'
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

  if (!profile) return null
  if (!isAdmin) return (
    <div style={{ minHeight:'100vh', background:C.bg, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'Inter,sans-serif' }}>
      <div style={{ textAlign:'center' }}>
        <div style={{ fontSize:40, marginBottom:12 }}>🔒</div>
        <div style={{ fontFamily:'Fraunces,serif', fontSize:20, color:C.ink }}>Admin access only</div>
      </div>
    </div>
  )

  return <AdminShell profile={profile} />
}

// Hooks that hit admin-only tables live here, below the isAdmin guard,
// so a non-admin landing on /admin never fires them.
function AdminShell({ profile }) {
  const [tab, setTab] = useState('overview')
  const fb = useAdminFeedback()
  const unreplied = useMemo(
    () => (fb.feedback || []).filter(f => !f.response).length,
    [fb.feedback]
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
            <button key={id} onClick={()=>setTab(id)} style={{ background: tab===id ? C.navy : C.card, color: tab===id ? '#fff' : C.mid, border: tab===id ? 'none' : `1px solid ${C.border}`, borderRadius:20, padding:'8px 18px', fontSize:13, fontWeight:600, display:'flex', alignItems:'center', gap:7 }}>
              {label}
              {id === 'feedback' && unreplied > 0 && (
                <span style={{ background:C.rose, color:'#fff', borderRadius:9, minWidth:18, height:18, padding:'0 5px', fontSize:11, fontWeight:700, display:'inline-flex', alignItems:'center', justifyContent:'center' }}>{unreplied}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {tab === 'overview'   && <OverviewPanel />}
      {tab === 'users'      && <UsersPanel />}
      {tab === 'towns'      && <TownsPanel />}
      {tab === 'businesses' && <BusinessesPanel />}
      {tab === 'offers'     && <OffersPanel />}
      {tab === 'feedback'   && <FeedbackPanel {...fb} unreplied={unreplied} />}
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
  const { spots, loading, deleteSpot, createSpot, updateSpot } = useAdminSpots()
  const { towns } = useAdminTowns()
  const [q, setQ] = useState('')
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [editing, setEditing] = useState(null)   // spot object, or 'new', or null
  const [err, setErr] = useState('')

  const filtered = spots.filter(s =>
    s.name.toLowerCase().includes(q.toLowerCase()) ||
    s.towns?.name?.toLowerCase().includes(q.toLowerCase()) ||
    s.category?.toLowerCase().includes(q.toLowerCase())
  )

  async function handleDelete(spotId) {
    setDeleting(true)
    const { error } = await deleteSpot(spotId)
    setDeleting(false); setConfirmDeleteId(null)
    if (error) { setErr(error.message); setTimeout(()=>setErr(''),5000) }
  }

  if (editing) {
    return <BusinessForm
      spot={editing === 'new' ? null : editing}
      towns={towns}
      onCancel={()=>setEditing(null)}
      onSave={async (form) => {
        const fn = editing === 'new' ? createSpot : (f)=>updateSpot(editing.id, f)
        const { error } = await fn(form)
        if (error) return { error }
        setEditing(null)
        return {}
      }}
    />
  }

  return (
    <div style={{ maxWidth:880, margin:'0 auto', padding:'32px 24px 60px' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:12, marginBottom:8 }}>
        <h1 style={{ fontFamily:'Fraunces,serif', fontSize:28, fontWeight:700 }}>Businesses ({spots.length})</h1>
        <button onClick={()=>setEditing('new')} style={{ background:C.amber, border:'none', borderRadius:10, padding:'10px 18px', fontSize:13.5, fontWeight:600, color:C.navy, cursor:'pointer' }}>+ Add business</button>
      </div>
      <p style={{ fontSize:14, color:C.muted, marginBottom:20 }}>Create, edit, or remove any business. Deleting one clears all its stamps, visits, offers, and feedback.</p>

      <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search by name, town, or category…"
        style={{ width:'100%', background:C.card, border:`1px solid ${C.border}`, borderRadius:12, padding:'11px 14px', fontSize:14, marginBottom:18 }}/>

      {err && <div style={{ background:'#FEF2F2', border:'1px solid #FECACA', borderRadius:10, padding:'11px 14px', fontSize:13, color:'#DC2626', marginBottom:14 }}>⚠ {err}</div>}

      {loading ? <div style={{ color:C.muted }}>Loading…</div> : filtered.length === 0 ? (
        <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:15, padding:'40px', textAlign:'center', color:C.muted }}>
          {spots.length === 0 ? 'No businesses yet — add one above.' : 'No matches.'}
        </div>
      ) : (
        <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:15, overflow:'hidden' }}>
          {filtered.map((s, i) => (
            <div key={s.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'13px 16px', borderBottom: i<filtered.length-1 ? `1px solid ${C.border}` : 'none', flexWrap:'wrap' }}>
              <span style={{ fontSize:22 }}>{s.emoji}</span>
              <div style={{ flex:1, minWidth:160 }}>
                <div style={{ fontSize:14, fontWeight:600 }}>{s.name}</div>
                <div style={{ fontSize:12, color:C.muted }}>{s.category} · {s.towns?.name}, {s.towns?.state} · owner: {s.profiles?.full_name || 'unknown'}</div>
              </div>
              {confirmDeleteId === s.id ? (
                <>
                  <span style={{ fontSize:12, color:C.rose, fontWeight:600 }}>Delete?</span>
                  <button onClick={()=>handleDelete(s.id)} disabled={deleting} style={{ background:'#DC2626', border:'none', borderRadius:9, padding:'6px 13px', fontSize:12, fontWeight:600, color:'#fff', flexShrink:0 }}>{deleting?'…':'Yes'}</button>
                  <button onClick={()=>setConfirmDeleteId(null)} style={{ background:'none', border:`1px solid ${C.border}`, borderRadius:9, padding:'6px 13px', fontSize:12, color:C.mid, flexShrink:0 }}>No</button>
                </>
              ) : (
                <>
                  <button onClick={()=>setEditing(s)} style={{ background:'none', border:`1px solid ${C.border}`, borderRadius:9, padding:'7px 13px', fontSize:12, fontWeight:600, color:C.navy, cursor:'pointer', flexShrink:0 }}>Edit</button>
                  <button onClick={()=>setConfirmDeleteId(s.id)} title="Delete" style={{ background:'none', border:`1px solid ${C.border}`, borderRadius:9, width:32, height:32, display:'flex', alignItems:'center', justifyContent:'center', color:C.rose, fontSize:14, flexShrink:0 }}>🗑</button>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const BIZ_CATEGORIES = ['Bakery','Coffee','Restaurant','Salon','Barbershop','Bookshop','Florist','Gym','Boutique','Auto','Pet care','Other']
const BIZ_EMOJIS = ['🥐','☕','🍕','✂️','📚','🌸','💪','🎨','🛒','🐾','🔧','🏪','🍔','🍣','🧁','🌮','🍷','🎵']

function BusinessForm({ spot, towns, onCancel, onSave }) {
  const [f, setF] = useState({
    name: spot?.name || '',
    emoji: spot?.emoji || '🏪',
    category: spot?.category || '',
    town_id: spot?.town_id || '',
    tagline: spot?.tagline || '',
    perk: spot?.perk || '',
    stamps_required: String(spot?.stamps_required ?? 8),
  })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const up = (k,v) => setF(p=>({ ...p, [k]:v }))
  const ready = f.name.trim() && f.category && f.town_id && f.perk.trim()

  async function save() {
    setSaving(true); setErr('')
    const { error } = await onSave(f)
    setSaving(false)
    if (error) setErr(error.message)
  }

  return (
    <div style={{ maxWidth:620, margin:'0 auto', padding:'32px 24px 60px' }}>
      <button onClick={onCancel} style={{ background:'none', border:'none', color:C.mid, fontSize:13, cursor:'pointer', marginBottom:14 }}>← Back to businesses</button>
      <h1 style={{ fontFamily:'Fraunces,serif', fontSize:26, fontWeight:700, marginBottom:20 }}>{spot ? 'Edit business' : 'Add a business'}</h1>

      <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:16, padding:'22px', display:'flex', flexDirection:'column', gap:16 }}>
        <div>
          <label style={{ fontSize:12.5, fontWeight:600, color:C.mid, display:'block', marginBottom:7 }}>Icon</label>
          <div style={{ display:'flex', flexWrap:'wrap', gap:7 }}>
            {BIZ_EMOJIS.map(em=>(
              <button key={em} onClick={()=>up('emoji',em)} style={{ width:36, height:36, borderRadius:9, fontSize:18, background:f.emoji===em?C.amberSoft:C.bg, border:`2px solid ${f.emoji===em?C.amber:C.border}`, cursor:'pointer' }}>{em}</button>
            ))}
          </div>
        </div>
        <FormRow label="Business name"><input value={f.name} onChange={e=>up('name',e.target.value)} placeholder="Rosa's Bakery" style={inp}/></FormRow>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
          <FormRow label="Category">
            <select value={f.category} onChange={e=>up('category',e.target.value)} style={inp}>
              <option value="">Select…</option>
              {BIZ_CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}
            </select>
          </FormRow>
          <FormRow label="Town">
            <select value={f.town_id} onChange={e=>up('town_id',e.target.value)} style={inp}>
              <option value="">Select…</option>
              {towns.map(t=><option key={t.id} value={t.id}>{t.name}, {t.state}</option>)}
            </select>
          </FormRow>
        </div>
        <FormRow label="One-line description"><input value={f.tagline} onChange={e=>up('tagline',e.target.value)} placeholder="Family-owned since 1987" maxLength={50} style={inp}/></FormRow>
        <FormRow label={`Stamps for a reward: ${f.stamps_required}`}>
          <input type="range" min={4} max={15} value={f.stamps_required} onChange={e=>up('stamps_required',e.target.value)} style={{ width:'100%', accentColor:C.amber }}/>
        </FormRow>
        <FormRow label="Reward"><input value={f.perk} onChange={e=>up('perk',e.target.value)} placeholder="Free pastry of your choice" maxLength={50} style={inp}/></FormRow>

        {err && <div style={{ background:'#FEF2F2', border:'1px solid #FECACA', borderRadius:10, padding:'10px 13px', fontSize:13, color:'#DC2626' }}>⚠ {err}</div>}

        <button onClick={save} disabled={!ready||saving} style={{ background:ready&&!saving?C.amber:'#E8E3DC', border:'none', borderRadius:11, padding:'13px', fontSize:14, fontWeight:600, color:ready&&!saving?C.navy:C.muted, cursor:ready&&!saving?'pointer':'default' }}>
          {saving ? 'Saving…' : spot ? 'Save changes' : 'Create business'}
        </button>
      </div>
    </div>
  )
}

const inp = { width:'100%', background:'#FDF8F2', border:'1px solid #E8E3DC', borderRadius:10, padding:'11px 13px', fontSize:14, color:'#1A1A2E' }
function FormRow({ label, children }) {
  return <div><label style={{ fontSize:12.5, fontWeight:600, color:'#6B7280', display:'block', marginBottom:6 }}>{label}</label>{children}</div>
}

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
function FeedbackPanel({ feedback, loading, respond, unreplied }) {
  const MOODS = ['', '😞', '😐', '🙂', '😍']  // mood is 1–4
  const MOOD_LABEL = ['', 'Unhappy', 'Meh', 'Good', 'Loved it']

  const [replyingTo, setReplyingTo] = useState(null)
  const [text, setText] = useState('')
  const [saving, setSaving] = useState(false)

  const [status, setStatus] = useState('all')      // all | unreplied | replied
  const [mood, setMood]     = useState('all')      // all | 1..4
  const [spot, setSpot]     = useState('all')      // all | spot_name
  const [sort, setSort]     = useState('newest')   // newest | oldest | worst

  const rows = feedback || []

  const spots = useMemo(
    () => [...new Set(rows.map(f => f.spot_name).filter(Boolean))].sort(),
    [rows]
  )

  const visible = useMemo(() => {
    let out = rows.filter(f => {
      if (status === 'unreplied' && f.response) return false
      if (status === 'replied'   && !f.response) return false
      if (mood !== 'all' && Number(f.mood) !== Number(mood)) return false
      if (spot !== 'all' && f.spot_name !== spot) return false
      return true
    })
    out = [...out].sort((a, b) => {
      if (sort === 'oldest') return new Date(a.created_at) - new Date(b.created_at)
      if (sort === 'worst')  return (a.mood ?? 9) - (b.mood ?? 9) || new Date(b.created_at) - new Date(a.created_at)
      return new Date(b.created_at) - new Date(a.created_at)
    })
    return out
  }, [rows, status, mood, spot, sort])

  async function send(id) {
    if (!text.trim()) return
    setSaving(true)
    await respond(id, text.trim())
    setSaving(false); setReplyingTo(null); setText('')
  }

  const selectStyle = {
    background:C.card, border:`1px solid ${C.border}`, borderRadius:9,
    padding:'7px 10px', fontSize:12.5, color:C.ink, cursor:'pointer',
  }

  function when(iso) {
    if (!iso) return ''
    const d = new Date(iso)
    const days = Math.floor((Date.now() - d) / 86400000)
    if (days === 0) return 'Today'
    if (days === 1) return 'Yesterday'
    if (days < 7)   return `${days}d ago`
    return d.toLocaleDateString()
  }

  return (
    <div style={{ maxWidth:880, margin:'0 auto', padding:'32px 24px 60px' }}>
      <div style={{ display:'flex', alignItems:'baseline', gap:12, flexWrap:'wrap', marginBottom:6 }}>
        <h1 style={{ fontFamily:'Fraunces,serif', fontSize:28, fontWeight:700 }}>Feedback</h1>
        {unreplied > 0 && (
          <button
            onClick={()=>setStatus(status === 'unreplied' ? 'all' : 'unreplied')}
            style={{ background: status==='unreplied' ? C.rose : 'rgba(232,149,109,0.14)', color: status==='unreplied' ? '#fff' : C.rose, border:'none', borderRadius:20, padding:'5px 13px', fontSize:12, fontWeight:700 }}>
            {unreplied} awaiting reply
          </button>
        )}
      </div>
      <p style={{ fontSize:14, color:C.muted, marginBottom:16 }}>What customers have said across every business. Reply to any of them.</p>

      <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:16 }}>
        <select value={status} onChange={e=>setStatus(e.target.value)} style={selectStyle}>
          <option value="all">All feedback</option>
          <option value="unreplied">Needs a reply</option>
          <option value="replied">Replied</option>
        </select>
        <select value={mood} onChange={e=>setMood(e.target.value)} style={selectStyle}>
          <option value="all">Any mood</option>
          {[1,2,3,4].map(m => <option key={m} value={m}>{MOODS[m]} {MOOD_LABEL[m]}</option>)}
        </select>
        <select value={spot} onChange={e=>setSpot(e.target.value)} style={selectStyle}>
          <option value="all">All businesses</option>
          {spots.map(sn => <option key={sn} value={sn}>{sn}</option>)}
        </select>
        <select value={sort} onChange={e=>setSort(e.target.value)} style={selectStyle}>
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="worst">Unhappiest first</option>
        </select>
        {(status!=='all'||mood!=='all'||spot!=='all'||sort!=='newest') && (
          <button onClick={()=>{ setStatus('all'); setMood('all'); setSpot('all'); setSort('newest') }}
            style={{ background:'none', border:'none', color:C.mid, fontSize:12.5, textDecoration:'underline', padding:'7px 4px' }}>
            Clear
          </button>
        )}
      </div>

      {loading ? <div style={{ color:C.muted }}>Loading…</div> : rows.length === 0 ? (
        <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:15, padding:'40px', textAlign:'center', color:C.muted }}>No feedback yet.</div>
      ) : visible.length === 0 ? (
        <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:15, padding:'40px', textAlign:'center', color:C.muted }}>Nothing matches those filters.</div>
      ) : (
        <>
          <div style={{ fontSize:12, color:C.muted, marginBottom:8 }}>
            Showing {visible.length} of {rows.length}
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {visible.map(f => {
              const needsReply = !f.response
              return (
              <div key={f.id} style={{
                background:C.card,
                border:`1px solid ${needsReply ? 'rgba(232,149,109,0.45)' : C.border}`,
                borderLeft: needsReply ? `3px solid ${C.rose}` : `1px solid ${C.border}`,
                borderRadius:13, padding:'14px 16px'
              }}>
                <div style={{ display:'flex', gap:12, alignItems:'flex-start' }}>
                  <span style={{ fontSize:22, flexShrink:0 }} title={MOOD_LABEL[f.mood] || ''}>{MOODS[f.mood] || '•'}</span>
                  <div style={{ flex:1, minWidth:0 }}>
                    {f.note
                      ? <div style={{ fontSize:13.5, color:C.ink, marginBottom:3, whiteSpace:'pre-wrap' }}>{f.note}</div>
                      : <div style={{ fontSize:13.5, color:C.muted, fontStyle:'italic', marginBottom:3 }}>Rating only — no comment</div>}
                    <div style={{ fontSize:12, color:C.muted }}>{f.spot_name} · {when(f.created_at)}</div>
                  </div>
                  {needsReply && replyingTo !== f.id && (
                    <button onClick={()=>{ setReplyingTo(f.id); setText('') }} style={{ background:'none', border:`1px solid ${C.border}`, borderRadius:9, padding:'6px 13px', fontSize:12, fontWeight:600, color:C.navy, cursor:'pointer', flexShrink:0 }}>Reply</button>
                  )}
                </div>

                {f.response && (
                  <div style={{ marginTop:10, marginLeft:34, background:C.amberSoft, border:`1px solid ${C.amberBrd}`, borderRadius:10, padding:'10px 13px' }}>
                    <div style={{ fontSize:10, fontWeight:700, color:C.amber, letterSpacing:'0.06em', textTransform:'uppercase', marginBottom:3 }}>
                      Your reply{f.responded_at ? ` · ${when(f.responded_at)}` : ''}
                    </div>
                    <div style={{ fontSize:13, color:C.ink, whiteSpace:'pre-wrap' }}>{f.response}</div>
                  </div>
                )}

                {replyingTo === f.id && (
                  <div style={{ marginTop:10, marginLeft:34 }}>
                    <textarea value={text} onChange={e=>setText(e.target.value)} placeholder="Write a reply…" autoFocus
                      style={{ width:'100%', background:C.bg, border:`1px solid ${C.border}`, borderRadius:10, padding:'10px 13px', fontSize:13.5, color:C.ink, resize:'vertical', minHeight:64, fontFamily:'inherit' }}/>
                    <div style={{ display:'flex', gap:8, marginTop:8 }}>
                      <button onClick={()=>send(f.id)} disabled={!text.trim()||saving} style={{ background:text.trim()&&!saving?C.amber:'#E8E3DC', border:'none', borderRadius:9, padding:'8px 16px', fontSize:12.5, fontWeight:600, color:text.trim()&&!saving?C.navy:C.muted, cursor:text.trim()&&!saving?'pointer':'default' }}>{saving?'Sending…':'Send reply'}</button>
                      <button onClick={()=>{ setReplyingTo(null); setText('') }} style={{ background:'none', border:`1px solid ${C.border}`, borderRadius:9, padding:'8px 14px', fontSize:12.5, color:C.mid, cursor:'pointer' }}>Cancel</button>
                    </div>
                  </div>
                )}
              </div>
            )})}
          </div>
        </>
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
