import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'
import { useIsAdmin } from '../lib/hooks'

// Matches the admin panel palette in AdminTowns.
const C = {
  bg:'#FDF8F2', card:'#FFFFFF', navy:'#1A1A2E',
  amber:'#F5A623', amberSoft:'#FEF3DC', amberBrd:'rgba(245,166,35,0.3)',
  sage:'#7BA05B', rose:'#E8956D',
  ink:'#1A1A2E', mid:'#6B7280', muted:'#9CA3AF', border:'#E8E3DC',
}

/**
 * Admin inbox. Thread list, then a conversation view.
 *
 * Threads are keyed by spot rather than by owner — at pilot scale you think
 * in terms of "the deli," not the person who runs it, and a thread should
 * survive a listing changing hands.
 */
export default function AdminMessages() {
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

  return <Inbox profile={profile} />
}

function Inbox({ profile }) {
  const { session } = useAuth()
  const [threads, setThreads] = useState([])
  const [loading, setLoading] = useState(true)
  const [active, setActive]   = useState(null)
  const [error, setError]     = useState('')

  async function loadThreads() {
    const { data, error: err } = await supabase.rpc('admin_threads')
    if (err) { setError(err.message); setLoading(false); return }
    setThreads(data || [])
    setLoading(false)
  }

  useEffect(() => {
    loadThreads()
    const t = setInterval(loadThreads, 20000)
    return () => clearInterval(t)
  }, [])

  return (
    <div style={{ minHeight:'100vh', background:C.bg, fontFamily:'Inter,sans-serif', color:C.ink }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,600;0,9..144,700&family=Inter:wght@400;500;600&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        textarea{outline:none;font-family:inherit}
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

      <div style={{ maxWidth:880, margin:'0 auto', padding:'24px 24px 60px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:20 }}>
          {active ? (
            <button onClick={()=>{ setActive(null); loadThreads() }}
              style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:20, padding:'8px 16px', fontSize:13, fontWeight:600, color:C.mid }}>
              ← Inbox
            </button>
          ) : (
            <a href="/admin" style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:20, padding:'8px 16px', fontSize:13, fontWeight:600, color:C.mid, textDecoration:'none' }}>
              ← Admin
            </a>
          )}
          <h1 style={{ fontFamily:'Fraunces,serif', fontSize:22, fontWeight:700, color:C.ink }}>
            {active ? `${active.spot_emoji || '🏠'} ${active.spot_name}` : 'Messages'}
          </h1>
        </div>

        {error && (
          <div style={{ background:'#FDF0EA', border:`1px solid ${C.rose}`, borderRadius:11, padding:'11px 14px', fontSize:13, color:'#B4553A', marginBottom:16 }}>
            {error}
          </div>
        )}

        {active ? (
          <Thread spotId={active.spot_id} senderId={session?.user?.id} onSent={loadThreads} />
        ) : loading ? (
          <div style={{ fontSize:13.5, color:C.muted }}>Loading…</div>
        ) : threads.length === 0 ? (
          <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:16, padding:'40px 24px', textAlign:'center' }}>
            <div style={{ fontSize:32, marginBottom:12 }}>📭</div>
            <div style={{ fontSize:15, fontWeight:600, color:C.ink, marginBottom:6 }}>No messages yet</div>
            <div style={{ fontSize:13, color:C.muted, lineHeight:1.6 }}>
              Threads appear here as soon as an owner writes in from their dashboard.
            </div>
          </div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {threads.map(t => (
              <button key={t.spot_id} onClick={()=>setActive(t)}
                style={{ textAlign:'left', background:C.card, border:`1px solid ${t.unread > 0 ? C.amber : C.border}`, borderRadius:14, padding:'15px 18px', display:'flex', gap:13, alignItems:'flex-start', animation:'up 0.3s ease' }}>
                <span style={{ fontSize:24, flexShrink:0, lineHeight:1.1 }}>{t.spot_emoji || '🏠'}</span>
                <span style={{ flex:1, minWidth:0 }}>
                  <span style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <span style={{ fontSize:14.5, fontWeight:600, color:C.ink }}>{t.spot_name}</span>
                    {t.unread > 0 && (
                      <span style={{ background:C.rose, color:'#fff', borderRadius:9, minWidth:18, height:18, padding:'0 5px', fontSize:11, fontWeight:700, display:'inline-flex', alignItems:'center', justifyContent:'center' }}>
                        {t.unread}
                      </span>
                    )}
                  </span>
                  <span style={{ display:'block', fontSize:13, color:C.muted, marginTop:4, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                    {t.last_role === 'admin' ? 'You: ' : ''}{t.last_body}
                  </span>
                </span>
                <span style={{ fontSize:11.5, color:C.muted, flexShrink:0 }}>{timeAgo(t.last_at)}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function Thread({ spotId, senderId, onSent }) {
  const [msgs, setMsgs]       = useState([])
  const [loading, setLoading] = useState(true)
  const [draft, setDraft]     = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError]     = useState('')
  const scrollRef = useRef(null)

  async function load(markRead = false) {
    const { data, error: err } = await supabase
      .from('messages')
      .select('*')
      .eq('spot_id', spotId)
      .order('created_at', { ascending: true })
    if (err) { setError(err.message); setLoading(false); return }
    setMsgs(data || [])
    setLoading(false)
    if (markRead) supabase.rpc('mark_thread_read', { p_spot_id: spotId })
  }

  useEffect(() => {
    load(true)
    const t = setInterval(() => load(true), 15000)
    return () => clearInterval(t)
  }, [spotId])

  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [msgs.length])

  async function send() {
    const body = draft.trim()
    if (!body || sending) return
    setSending(true)
    setError('')
    const { error: err } = await supabase.from('messages').insert({
      spot_id: spotId, sender_id: senderId, sender_role: 'admin', body,
    })
    setSending(false)
    if (err) return setError(err.message)
    setDraft('')
    load()
    onSent?.()
  }

  const canSend = !!draft.trim() && !sending

  return (
    <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:16, overflow:'hidden', animation:'up 0.3s ease' }}>
      <div ref={scrollRef} style={{ maxHeight:'55vh', minHeight:240, overflowY:'auto', padding:'20px 22px', display:'flex', flexDirection:'column', gap:12 }}>
        {loading
          ? <div style={{ fontSize:13.5, color:C.muted }}>Loading…</div>
          : msgs.map(m => <Bubble key={m.id} m={m} mine={m.sender_role === 'admin'} />)}
      </div>

      <div style={{ padding:'14px 22px 18px', borderTop:`1px solid ${C.border}`, background:C.bg }}>
        {error && <div style={{ fontSize:12.5, color:'#B4553A', marginBottom:10 }}>{error}</div>}
        <div style={{ display:'flex', gap:9, alignItems:'flex-end' }}>
          <textarea
            value={draft}
            onChange={e=>setDraft(e.target.value)}
            onKeyDown={e=>{ if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
            placeholder="Reply…"
            rows={2}
            style={{ flex:1, background:C.card, border:`1px solid ${C.border}`, borderRadius:12, padding:'12px 14px', fontSize:14, color:C.ink, lineHeight:1.5, resize:'none' }}
          />
          <button onClick={send} disabled={!canSend}
            style={{ background: canSend ? C.amber : '#E8E3DC', border:'none', borderRadius:12, padding:'13px 20px', fontSize:14, fontWeight:600, color: canSend ? C.navy : C.muted, cursor: canSend ? 'pointer' : 'default', flexShrink:0, transition:'all 0.2s' }}>
            {sending ? '…' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  )
}

function Bubble({ m, mine }) {
  return (
    <div style={{ display:'flex', justifyContent: mine ? 'flex-end' : 'flex-start' }}>
      <div style={{ maxWidth:'78%' }}>
        <div style={{
          background: mine ? C.amberSoft : C.bg,
          border:`1px solid ${mine ? C.amberBrd : C.border}`,
          borderRadius: mine ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
          padding:'11px 14px', fontSize:14, color:C.ink, lineHeight:1.55,
          whiteSpace:'pre-wrap', wordBreak:'break-word',
        }}>
          {m.body}
        </div>
        <div style={{ fontSize:11, color:C.muted, marginTop:5, textAlign: mine ? 'right' : 'left' }}>
          {mine ? 'You' : 'Owner'} · {timeAgo(m.created_at)}
        </div>
      </div>
    </div>
  )
}

function timeAgo(ts) {
  const s = Math.floor((Date.now() - new Date(ts).getTime()) / 1000)
  if (s < 60)     return 'just now'
  if (s < 3600)   return `${Math.floor(s/60)}m ago`
  if (s < 86400)  return `${Math.floor(s/3600)}h ago`
  if (s < 604800) return `${Math.floor(s/86400)}d ago`
  return new Date(ts).toLocaleDateString()
}
