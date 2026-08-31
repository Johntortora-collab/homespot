import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'

const C = {
  bg:'#13131F', card:'#1E1E30', card2:'#252538',
  amber:'#F5A623', sage:'#7BA05B',
  dim:'rgba(255,255,255,0.45)', border:'rgba(255,255,255,0.08)',
}

/**
 * Admin inbox. Thread list on the left, conversation on the right; on a
 * narrow screen the list collapses once a thread is open.
 *
 * Threads are per spot, so the heading is the business name rather than the
 * owner's — at pilot scale you think in terms of "the deli," not the person.
 */
export default function AdminMessages() {
  const { session } = useAuth()
  const [threads, setThreads] = useState([])
  const [loading, setLoading] = useState(true)
  const [active, setActive]   = useState(null)   // { spot_id, spot_name, spot_emoji }
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
    <div style={{ minHeight:'100vh', background:C.bg, fontFamily:'Inter,sans-serif', padding:'24px 18px 60px' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,700&family=Inter:wght@400;500;600;700&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        textarea{outline:none;font-family:inherit}
      `}</style>

      <div style={{ maxWidth:920, margin:'0 auto' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:18 }}>
          {active && (
            <button onClick={()=>{ setActive(null); loadThreads() }}
              style={{ background:'none', border:`1px solid ${C.border}`, borderRadius:9, padding:'6px 11px', fontSize:12.5, color:C.dim, cursor:'pointer', fontFamily:'inherit' }}>
              ← Inbox
            </button>
          )}
          <h1 style={{ fontFamily:'Fraunces,serif', fontSize:22, color:'#fff', fontWeight:700 }}>
            {active ? `${active.spot_emoji || ''} ${active.spot_name}` : 'Messages'}
          </h1>
        </div>

        {error && (
          <div style={{ background:'rgba(232,149,109,0.1)', border:'1px solid rgba(232,149,109,0.35)', borderRadius:11, padding:'11px 13px', fontSize:12.5, color:'#E8956D', marginBottom:14 }}>
            {error}
          </div>
        )}

        {active ? (
          <Thread
            spotId={active.spot_id}
            senderId={session?.user?.id}
            onSent={loadThreads}
          />
        ) : loading ? (
          <div style={{ fontSize:13, color:C.dim }}>Loading…</div>
        ) : threads.length === 0 ? (
          <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:16, padding:'26px 20px', textAlign:'center' }}>
            <div style={{ fontSize:30, marginBottom:10 }}>📭</div>
            <div style={{ fontSize:13.5, color:C.dim, lineHeight:1.6 }}>
              No messages yet. Threads appear here as soon as an owner writes in.
            </div>
          </div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:9 }}>
            {threads.map(t => (
              <button key={t.spot_id} onClick={()=>setActive(t)}
                style={{ textAlign:'left', background:C.card, border:`1px solid ${t.unread > 0 ? 'rgba(245,166,35,0.35)' : C.border}`, borderRadius:14, padding:'14px 16px', cursor:'pointer', fontFamily:'inherit', display:'flex', gap:12, alignItems:'flex-start' }}>
                <span style={{ fontSize:22, flexShrink:0, lineHeight:1.2 }}>{t.spot_emoji || '🏠'}</span>
                <span style={{ flex:1, minWidth:0 }}>
                  <span style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <span style={{ fontSize:14, fontWeight:600, color:'#fff' }}>{t.spot_name}</span>
                    {t.unread > 0 && (
                      <span style={{ background:C.amber, color:C.bg, fontSize:10.5, fontWeight:700, borderRadius:10, padding:'1px 7px' }}>
                        {t.unread}
                      </span>
                    )}
                  </span>
                  <span style={{ display:'block', fontSize:12.5, color:C.dim, marginTop:4, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                    {t.last_role === 'admin' ? 'You: ' : ''}{t.last_body}
                  </span>
                </span>
                <span style={{ fontSize:10.5, color:'#555', flexShrink:0 }}>{timeAgo(t.last_at)}</span>
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

  return (
    <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:16, overflow:'hidden' }}>
      <div ref={scrollRef} style={{ maxHeight:'55vh', minHeight:220, overflowY:'auto', padding:'16px 18px', display:'flex', flexDirection:'column', gap:10 }}>
        {loading
          ? <div style={{ fontSize:12.5, color:C.dim }}>Loading…</div>
          : msgs.map(m => <Bubble key={m.id} m={m} mine={m.sender_role === 'admin'} />)}
      </div>

      <div style={{ padding:'12px 18px 16px', borderTop:`1px solid ${C.border}` }}>
        {error && <div style={{ fontSize:12, color:'#E8956D', marginBottom:9 }}>{error}</div>}
        <div style={{ display:'flex', gap:8, alignItems:'flex-end' }}>
          <textarea
            value={draft}
            onChange={e=>setDraft(e.target.value)}
            onKeyDown={e=>{ if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
            placeholder="Reply…"
            rows={2}
            style={{ flex:1, background:C.bg, border:`1px solid ${C.border}`, borderRadius:11, padding:'11px 13px', fontSize:13.5, color:'#fff', resize:'none' }}
          />
          <button onClick={send} disabled={sending || !draft.trim()}
            style={{ background:(sending || !draft.trim()) ? '#33334A' : C.amber, border:'none', borderRadius:11, padding:'12px 17px', fontSize:13.5, fontWeight:700, color:(sending || !draft.trim()) ? '#777' : C.bg, cursor:(sending || !draft.trim()) ? 'default' : 'pointer', fontFamily:'inherit', flexShrink:0 }}>
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
          background: mine ? 'rgba(245,166,35,0.14)' : C.card2,
          border:`1px solid ${mine ? 'rgba(245,166,35,0.28)' : C.border}`,
          borderRadius: mine ? '13px 13px 4px 13px' : '13px 13px 13px 4px',
          padding:'10px 13px', fontSize:13.5, color:'#fff', lineHeight:1.55,
          whiteSpace:'pre-wrap', wordBreak:'break-word',
        }}>
          {m.body}
        </div>
        <div style={{ fontSize:10.5, color:'#555', marginTop:4, textAlign: mine ? 'right' : 'left' }}>
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
