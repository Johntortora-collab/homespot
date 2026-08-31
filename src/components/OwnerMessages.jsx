import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'

// Matches the owner dashboard palette, not the dark consumer/preview one.
const C = {
  bg:'#FDF8F2', card:'#FFFFFF', navy:'#1A1A2E',
  amber:'#F5A623', amberSoft:'#FEF3DC', amberBrd:'rgba(245,166,35,0.3)',
  ink:'#1A1A2E', mid:'#6B7280', muted:'#9CA3AF', border:'#E8E3DC',
}

/**
 * The owner's side of a conversation with Homespot support.
 *
 * Polls rather than using realtime: enabling replication is an extra setup
 * step that fails silently when missed, and a fifteen-second delay is fine
 * for a channel where replies come back in hours.
 */
export default function OwnerMessages({ spot }) {
  const { session } = useAuth()
  const [msgs, setMsgs]       = useState([])
  const [loading, setLoading] = useState(true)
  const [draft, setDraft]     = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError]     = useState('')
  const scrollRef = useRef(null)

  const spotId = spot?.id

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

  const canSend = !!draft.trim() && !sending

  return (
    <div style={{ animation:'up 0.3s ease' }}>
      <div style={{ marginBottom:26 }}>
        <div style={{ fontSize:11, fontWeight:700, color:C.amber, letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:5 }}>Support</div>
        <h1 style={{ fontFamily:'Fraunces,serif', fontSize:28, fontWeight:700, color:C.ink, lineHeight:1.15, marginBottom:5 }}>Message us</h1>
        <p style={{ fontSize:13, color:C.muted }}>
          Questions about {spot?.name || 'your listing'}? We usually reply the same day.
        </p>
      </div>

      <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:16, overflow:'hidden' }}>
        <div ref={scrollRef} style={{ maxHeight:'52vh', minHeight:240, overflowY:'auto', padding:'20px 22px', display:'flex', flexDirection:'column', gap:12 }}>
          {loading ? (
            <div style={{ fontSize:13.5, color:C.muted }}>Loading…</div>
          ) : msgs.length === 0 ? (
            <div style={{ textAlign:'center', padding:'26px 10px' }}>
              <div style={{ fontSize:30, marginBottom:12 }}>💬</div>
              <div style={{ fontSize:14, fontWeight:600, color:C.ink, marginBottom:6 }}>No messages yet</div>
              <div style={{ fontSize:13, color:C.muted, lineHeight:1.6, maxWidth:340, margin:'0 auto' }}>
                Ask us anything — changing your perk, fixing your hours, printing
                more tap tags, or anything that isn't working right.
              </div>
            </div>
          ) : msgs.map(m => <Bubble key={m.id} m={m} mine={m.sender_role === 'owner'} />)}
        </div>

        <div style={{ padding:'14px 22px 18px', borderTop:`1px solid ${C.border}`, background:C.bg }}>
          {error && (
            <div style={{ fontSize:12.5, color:'#B4553A', marginBottom:10, lineHeight:1.5 }}>{error}</div>
          )}
          <div style={{ display:'flex', gap:9, alignItems:'flex-end' }}>
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
              style={{ flex:1, background:C.card, border:`1px solid ${C.border}`, borderRadius:12, padding:'12px 14px', fontSize:14, color:C.ink, lineHeight:1.5, resize:'none' }}
            />
            <button
              onClick={send}
              disabled={!canSend}
              style={{ background: canSend ? C.amber : '#E8E3DC', border:'none', borderRadius:12, padding:'13px 20px', fontSize:14, fontWeight:600, color: canSend ? C.navy : C.muted, cursor: canSend ? 'pointer' : 'default', flexShrink:0, transition:'all 0.2s', boxShadow: canSend ? '0 6px 18px rgba(245,166,35,0.3)' : 'none' }}>
              {sending ? '…' : 'Send'}
            </button>
          </div>
        </div>
      </div>

      <p style={{ fontSize:12, color:C.muted, marginTop:14, lineHeight:1.6 }}>
        Prefer to talk? Call or text John at 848-391-9904.
      </p>
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
