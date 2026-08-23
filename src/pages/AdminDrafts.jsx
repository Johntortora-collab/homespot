import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'
import PhotoUpload from '../components/PhotoUpload'

const C = {
  bg:'#FDF8F2', card:'#FFFFFF', navy:'#1A1A2E',
  amber:'#F5A623', amberSoft:'#FEF3DC', amberBrd:'rgba(245,166,35,0.35)',
  sage:'#7BA05B', sageSoft:'#EDF4E8',
  ink:'#1A1A2E', mid:'#6B7280', muted:'#9CA3AF', border:'#E8E3DC',
}

/**
 * /admin/drafts — your field sheet.
 *
 * Built for a phone held in one hand on a sidewalk, not a desktop table: big
 * tap targets, the claim code readable at arm's length, and one tap to open
 * the preview you're about to show someone.
 */
export default function AdminDrafts() {
  const { profile } = useAuth()
  const navigate = useNavigate()

  const [rows,    setRows]    = useState([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState('')
  const [q,       setQ]       = useState('')
  const [copied,  setCopied]  = useState(null)
  const [copiedBoth, setCopiedBoth] = useState(null)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data, error: err } = await supabase.rpc('admin_draft_spots')
    if (err) setError(err.message)
    setRows(data || [])
    setLoading(false)
  }

  async function copyLink(id) {
    const url = `${window.location.origin}/preview/${id}`
    try {
      await navigator.clipboard.writeText(url)
    } catch {
      // Clipboard API needs a secure context and can still be blocked. Falling
      // back to a prompt means you can always get the link out by hand rather
      // than being stuck with a button that silently does nothing.
      window.prompt('Copy this link:', url)
    }
    setCopied(id)
    setTimeout(()=>setCopied(null), 1800)
  }

  async function setPhoto(spotId, url) {
    const { data, error: err } = await supabase.rpc('admin_set_spot_photo', {
      p_spot_id: spotId, p_photo_url: url,
    })
    if (err || !data?.ok) {
      setError(err?.message || data?.error || 'Could not save the photo.')
      return
    }
    setError('')
    // Update in place rather than refetching — you're often on a phone with
    // one bar, and a full reload would lose your scroll position mid-visit.
    setRows(prev => prev.map(r => r.id === spotId ? { ...r, photo_url: url } : r))
  }

  async function copyBoth(row) {
    const url = `${window.location.origin}/preview/${row.id}`
    const text =
      `Here's how ${row.name} would look on Homespot:\n${url}\n\n` +
      `Your code to go live: ${row.claim_code}`
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      window.prompt('Copy this:', text)
    }
    setCopiedBoth(row.id)
    setTimeout(()=>setCopiedBoth(null), 1800)
  }

  if (!profile?.is_admin) return (
    <Shell>
      <div style={{ textAlign:'center', padding:'60px 20px' }}>
        <div style={{ fontSize:38, marginBottom:12 }}>🔒</div>
        <div style={{ fontFamily:'Fraunces,serif', fontSize:19, fontWeight:700, marginBottom:8 }}>Admins only</div>
        <div style={{ fontSize:13.5, color:C.mid }}>This account doesn't have admin access.</div>
      </div>
    </Shell>
  )

  const needle  = q.trim().toLowerCase()
  const visible = rows.filter(r => !needle
    || r.name?.toLowerCase().includes(needle)
    || r.category?.toLowerCase().includes(needle)
    || r.address?.toLowerCase().includes(needle))

  const open    = visible.filter(r => !r.is_claimed)
  const claimed = visible.filter(r =>  r.is_claimed)

  return (
    <Shell>
      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:4 }}>
        <button onClick={()=>navigate('/admin')}
          style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:10, padding:'7px 12px', fontSize:12.5, color:C.mid, cursor:'pointer', fontFamily:'inherit' }}>
          ← Admin
        </button>
        <button onClick={load}
          style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:10, padding:'7px 12px', fontSize:12.5, color:C.mid, cursor:'pointer', fontFamily:'inherit', marginLeft:'auto' }}>
          ↻ Refresh
        </button>
      </div>

      <h1 style={{ fontFamily:'Fraunces,serif', fontSize:27, fontWeight:700, color:C.ink, marginTop:14, marginBottom:4 }}>
        Draft listings
      </h1>
      <p style={{ fontSize:13.5, color:C.mid, marginBottom:16, lineHeight:1.55 }}>
        {loading ? 'Loading…' : `${open.length} to pitch · ${claimed.length} live`}
      </p>

      {error && (
        <div style={{ background:'#FEF2F2', border:'1px solid #FECACA', borderRadius:11, padding:'11px 14px', fontSize:13, color:'#DC2626', marginBottom:14 }}>
          ⚠ {error}
        </div>
      )}

      <input
        value={q}
        onChange={e=>setQ(e.target.value)}
        placeholder="Search name, category, street…"
        style={{ width:'100%', background:C.card, border:`1px solid ${C.border}`, borderRadius:12, padding:'13px 15px', fontSize:15, color:C.ink, marginBottom:18, fontFamily:'inherit', outline:'none' }}
      />

      {!loading && open.length === 0 && claimed.length === 0 && (
        <div style={{ textAlign:'center', padding:'50px 20px', color:C.mid }}>
          <div style={{ fontSize:34, marginBottom:12 }}>📋</div>
          <div style={{ fontSize:14, lineHeight:1.6 }}>
            No drafts yet. Create them with <code style={{ background:C.card, padding:'2px 6px', borderRadius:5, fontSize:12.5 }}>create_draft_spot()</code> in the Supabase SQL editor.
          </div>
        </div>
      )}

      {open.length > 0 && (
        <>
          <SectionLabel>To pitch</SectionLabel>
          {open.map(r => (
            <DraftCard key={r.id} row={r} copied={copied===r.id} onCopy={()=>copyLink(r.id)}
              copiedBoth={copiedBoth===r.id} onCopyBoth={()=>copyBoth(r)}
              onPhoto={url=>setPhoto(r.id, url)} />
          ))}
        </>
      )}

      {claimed.length > 0 && (
        <>
          <SectionLabel>Live on Homespot 🎉</SectionLabel>
          {claimed.map(r => (
            <div key={r.id} style={{ background:C.sageSoft, border:`1px solid ${C.sage}45`, borderRadius:14, padding:'13px 15px', marginBottom:9, display:'flex', alignItems:'center', gap:12 }}>
              <span style={{ fontSize:22 }}>{r.emoji}</span>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontFamily:'Fraunces,serif', fontSize:15, fontWeight:700, color:C.ink }}>{r.name}</div>
                <div style={{ fontSize:11.5, color:'#3D6B27', marginTop:2 }}>
                  Claimed {r.claimed_at ? new Date(r.claimed_at).toLocaleDateString() : ''}
                </div>
              </div>
              <span style={{ fontSize:16, color:C.sage }}>✓</span>
            </div>
          ))}
        </>
      )}
    </Shell>
  )
}

function DraftCard({ row, copied, onCopy, copiedBoth, onCopyBoth, onPhoto }) {
  const [editingPhoto, setEditingPhoto] = useState(false)
  const noPhoto = !row.photo_url

  return (
    <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:15, padding:'15px 16px', marginBottom:11 }}>
      <div style={{ display:'flex', alignItems:'flex-start', gap:12, marginBottom:13 }}>
        <span style={{ fontSize:26, lineHeight:1 }}>{row.emoji}</span>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontFamily:'Fraunces,serif', fontSize:16.5, fontWeight:700, color:C.ink, lineHeight:1.25 }}>{row.name}</div>
          <div style={{ fontSize:12, color:C.mid, marginTop:3 }}>
            {row.category}{row.address ? ` · ${row.address}` : ''}
          </div>
          <div style={{ fontSize:12, color:C.muted, marginTop:3 }}>
            Perk on file: {row.perk}
          </div>
        </div>
      </div>

      {/* Photo. Flagged loudly when missing — an emoji tile reads as a mockup,
          and the pitch lands hardest when they see their own storefront. On a
          phone the file picker offers the camera, so you can shoot the
          storefront and upload it standing outside. */}
      {editingPhoto ? (
        <div style={{ marginBottom:11 }}>
          <PhotoUpload
            value={row.photo_url}
            onChange={url => { onPhoto(url); if (url) setEditingPhoto(false) }}
          />
          <button onClick={()=>setEditingPhoto(false)}
            style={{ background:'none', border:'none', color:C.mid, fontSize:12, cursor:'pointer', marginTop:8, fontFamily:'inherit' }}>
            Done
          </button>
        </div>
      ) : noPhoto ? (
        <button onClick={()=>setEditingPhoto(true)}
          style={{ width:'100%', textAlign:'left', background:C.amberSoft, border:`1px solid ${C.amberBrd}`, borderRadius:9, padding:'10px 12px', fontSize:12, color:'#8A6A00', marginBottom:11, lineHeight:1.5, cursor:'pointer', fontFamily:'inherit' }}>
          📷 No photo yet — tap to add one before you show this
        </button>
      ) : (
        <div style={{ position:'relative', marginBottom:11 }}>
          <img src={row.photo_url} alt={row.name}
            style={{ width:'100%', height:120, objectFit:'cover', borderRadius:10, display:'block' }}/>
          <button onClick={()=>setEditingPhoto(true)}
            style={{ position:'absolute', right:8, bottom:8, background:'rgba(26,26,46,0.82)', border:'none', borderRadius:8, padding:'6px 11px', fontSize:11.5, fontWeight:600, color:'#fff', cursor:'pointer', fontFamily:'inherit' }}>
            Change photo
          </button>
        </div>
      )}

      {/* Link and code as plain readable text. The buttons below are faster
          when you have the phone in hand, but you also need to read these
          aloud, write them on a card, or dictate them over a phone call. */}
      <div style={{ background:C.bg, border:`1px dashed ${C.border}`, borderRadius:11, padding:'12px 13px', marginBottom:11 }}>
        <div style={{ fontSize:10.5, fontWeight:700, color:C.muted, letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:5 }}>
          Demo link
        </div>
        <div style={{ fontSize:13, color:C.ink, wordBreak:'break-all', lineHeight:1.45, marginBottom:12, userSelect:'all' }}>
          {typeof window !== 'undefined' ? window.location.host : ''}/preview/{row.id}
        </div>

        <div style={{ height:1, background:C.border, marginBottom:11 }}/>

        <div style={{ fontSize:10.5, fontWeight:700, color:C.muted, letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:4 }}>
          Code to go live
        </div>
        <div style={{ fontFamily:'monospace', fontSize:26, fontWeight:700, color:C.ink, letterSpacing:'0.16em', userSelect:'all' }}>
          {row.claim_code}
        </div>
      </div>

      <div style={{ display:'flex', gap:9, marginBottom:9 }}>
        <a
          href={`/preview/${row.id}`}
          target="_blank"
          rel="noopener noreferrer"
          style={{ flex:2, background:C.amber, borderRadius:11, padding:'13px', fontSize:13.5, fontWeight:700, color:C.navy, textAlign:'center', textDecoration:'none' }}>
          Open preview →
        </a>
        <button
          onClick={onCopy}
          style={{ flex:1, background:C.bg, border:`1px solid ${C.border}`, borderRadius:11, padding:'13px', fontSize:13, fontWeight:600, color: copied ? C.sage : C.mid, cursor:'pointer', fontFamily:'inherit' }}>
          {copied ? '✓ Copied' : 'Copy link'}
        </button>
      </div>

      {/* Both together, formatted to paste straight into a text or email —
          the common case when an owner says "send it to me, I'll look tonight." */}
      <button
        onClick={onCopyBoth}
        style={{ width:'100%', background:'none', border:`1px solid ${C.border}`, borderRadius:11, padding:'11px', fontSize:12.5, fontWeight:600, color: copiedBoth ? C.sage : C.mid, cursor:'pointer', fontFamily:'inherit' }}>
        {copiedBoth ? '✓ Copied link + code' : 'Copy link + code to send'}
      </button>
    </div>
  )
}

function SectionLabel({ children }) {
  return (
    <div style={{ fontSize:11, fontWeight:700, color:C.muted, letterSpacing:'0.1em', textTransform:'uppercase', margin:'20px 0 10px' }}>
      {children}
    </div>
  )
}

function Shell({ children }) {
  return (
    <div style={{ minHeight:'100vh', background:C.bg, fontFamily:'Inter,sans-serif' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,600;0,9..144,700&family=Inter:wght@400;500;600&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        input::placeholder{color:#9CA3AF}
      `}</style>
      <div style={{ maxWidth:560, margin:'0 auto', padding:'22px 16px 60px' }}>
        {children}
      </div>
    </div>
  )
}
