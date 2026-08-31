import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'

const C = {
  bg:'#13131F', card:'#1E1E30', card2:'#252538',
  amber:'#F5A623', sage:'#7BA05B',
  dim:'rgba(255,255,255,0.45)', border:'rgba(255,255,255,0.08)',
}

/**
 * The owner's side of a conversation with Homespot support.
 *
 * Polls rather than using realtime: enabling replication is an extra setup
 * step that fails silently when missed, and a fifteen-second delay is fine
 * for a channel where replies come back in hours. Worth revisiting only if
 * this turns into something people expect to feel live.
 */
export default function OwnerMessages({ spotId, spotName }) {
  const { session } = useAuth()
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
    if (!spotId) return
    load(true)
    const t = setInterval(() => load(true), 15000)
    return () => clearInterval(t)
  }, [spotId])

  useEffect(() => {
    // Pin to the newest message. Scrolls the thread box only, never the page.
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [msgs.length])

  async function send() {
    const body = draft.trim()
    if (!body || sending) return
    setSending(true)
    setError('')

    const { error: err } = await supabase.from('messages').insert({
      spot_id: spotId,
      sender_id: session.user.id,
      sender_role: 'owner',
      body,
    })

    setSending(false)
    if (err) return setError(err.message)
    setDraft('')
    load()
  }

  return (
    <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:16, overflow:'hidden' }}>
      <div style={{ padding:'15px 17px', borderBottom:`1px solid ${C.border}` }}>
        <div style={{ fontFamily:'Fraunces,serif', fontSize:16, fontWeight:700, color:'#fff' }}>
          Questions?
        </div>
        <div style={{ fontSize:12, color:C.dim, marginTop:3, lineHeight:1.5 }}>
          Message us about {spotName || 'your listing'} — we usually reply the same day.
        </div>
      </div>

      <div ref={scrollRef} style={{ maxHeight:320, overflowY:'auto', padding:'14px 17px', display:'flex', flexDirection:'column', gap:10 }}>
        {loading ? (
          <div style={{ fontSize:12.5, color:C.dim }}>Loading…</div>
        ) : msgs.length === 0 ? (
          <div style={{ fontSize:12.5, color:C.dim, lineHeight:1.6, padding:'8px 0' }}>
            No messages yet. Ask us anything — changing your perk, updating hours,
            printing more QR cards.
          </div>
        ) : msgs.map(m => <Bubble key={m.id} m={m} mine={m.sender_role === 'owner'} />)}
      </div>

      <div style={{ padding:'12px 17px 15px', borderTop:`1px solid ${C.border}` }}>
        {error && (
          <div style={{ fontSize:12, color:'#E8956D', marginBottom:9, lineHeight:1.5 }}>{error}</div>
        )}
        <div style={{ display:'flex', gap:8, alignItems:'flex-end' }}>
          <textarea
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => {
              // Enter sends, Shift+Enter breaks a line — the convention
              // everywhere else people type messages.
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
            }}
            placeholder="Type a message…"
            rows={2}
            style={{ flex:1, background:C.bg, border:`1px solid ${C.border}`, borderRadius:11, padding:'11px 13px', fontSize:13.5, color:'#fff', fontFamily:'inherit', resize:'none', outline:'none' }}
          />
          <button
            onClick={send}
            disabled={sending || !draft.trim()}
            style={{ background: (sending || !draft.trim()) ? '#33334A' : C.amber, border:'none', borderRadius:11, padding:'12px 16px', fontSize:13.5, fontWeight:700, color:(sending || !draft.trim()) ? '#777' : C.bg, cursor:(sending || !draft.trim()) ? 'default' : 'pointer', fontFamily:'inherit', flexShrink:0 }}>
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
      <div style={{ maxWidth:'80%' }}>
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
          {mine ? 'You' : 'Homespot'} · {timeAgo(m.created_at)}
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
