import { useRef, useState } from 'react'
import { supabase } from '../lib/supabase'

const BUCKET   = 'spot-photos'
const MAX_EDGE = 1400   // px on the long side
const QUALITY  = 0.82

/**
 * Owner-facing photo picker for a business storefront shot.
 *
 * Used in both the onboarding wizard (before the spot row exists) and the
 * dashboard settings page (after), which is why it deals in a plain URL string
 * rather than a spot id — the caller decides where the URL ends up.
 *
 * Files land at {user_id}/{uuid}.jpg. That folder prefix is load-bearing: the
 * storage RLS policy checks it, so an owner can only write inside their own
 * folder. Don't flatten the path.
 *
 * Props:
 *   value    — current photo URL (or null)
 *   onChange — called with the new URL, or null when removed
 *   colors   — palette override so this fits both owner surfaces
 */
export default function PhotoUpload({ value, onChange, colors = {} }) {
  const C = {
    bg:     '#FDF8F2',
    card:   '#FFFFFF',
    border: '#E8E3DC',
    ink:    '#1A1A2E',
    muted:  '#6B7280',
    amber:  '#F5A623',
    ...colors,
  }

  const inputRef = useRef(null)
  const [busy,  setBusy]  = useState(false)
  const [error, setError] = useState('')

  // Phone cameras produce 3–8MB files. Uploading those raw is slow on a shop's
  // wifi and pointless — the biggest we ever render is a full-width hero on a
  // phone screen. Resize and re-encode before it ever hits the network.
  async function compress(file) {
    const bitmap = await createImageBitmap(file)
    const scale  = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height))
    const w = Math.round(bitmap.width  * scale)
    const h = Math.round(bitmap.height * scale)

    const canvas = document.createElement('canvas')
    canvas.width  = w
    canvas.height = h
    canvas.getContext('2d').drawImage(bitmap, 0, 0, w, h)
    bitmap.close?.()

    const blob = await new Promise(res => canvas.toBlob(res, 'image/jpeg', QUALITY))
    if (!blob) throw new Error('Could not process that image.')
    return blob
  }

  async function handleFile(e) {
    const file = e.target.files?.[0]
    // Clear the input immediately so picking the same file twice still fires.
    e.target.value = ''
    if (!file) return

    setError('')

    if (!/^image\/(jpeg|png|webp|heic|heif)$/i.test(file.type)) {
      setError('Please choose a JPG, PNG, or WEBP image.')
      return
    }
    // Generous pre-compression ceiling — a 20MB original still compresses fine,
    // but something far bigger is probably a mistake worth catching early.
    if (file.size > 25 * 1024 * 1024) {
      setError('That image is too large. Try one under 25MB.')
      return
    }

    setBusy(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('You need to be signed in to upload a photo.')

      const blob = await compress(file)
      const path = `${user.id}/${crypto.randomUUID()}.jpg`

      const { error: upErr } = await supabase.storage
        .from(BUCKET)
        .upload(path, blob, { contentType: 'image/jpeg', upsert: false })
      if (upErr) throw upErr

      const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
      if (!data?.publicUrl) throw new Error('Upload finished but no URL came back.')

      // Best-effort cleanup of the photo being replaced. Failure here is
      // cosmetic (an orphaned file), so it must not block the save.
      removeStored(value, user.id)

      onChange(data.publicUrl)
    } catch (err) {
      setError(err.message || 'Upload failed. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  function removeStored(url, userId) {
    if (!url) return
    try {
      const marker = `/${BUCKET}/`
      const i = url.indexOf(marker)
      if (i === -1) return
      const path = url.slice(i + marker.length)
      // Only touch files in this user's own folder.
      if (!path.startsWith(`${userId}/`)) return
      supabase.storage.from(BUCKET).remove([path])
    } catch {}
  }

  async function handleRemove() {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) removeStored(value, user.id)
    onChange(null)
    setError('')
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
        onChange={handleFile}
        style={{ display:'none' }}
      />

      {value ? (
        <div style={{ position:'relative', borderRadius:13, overflow:'hidden', border:`1px solid ${C.border}` }}>
          <img
            src={value}
            alt="Your business"
            style={{ display:'block', width:'100%', height:170, objectFit:'cover', background:C.bg }}
          />
          <div style={{ display:'flex', gap:8, padding:10, background:C.card }}>
            <button
              type="button"
              onClick={()=>inputRef.current?.click()}
              disabled={busy}
              style={{ flex:1, background:C.bg, border:`1px solid ${C.border}`, borderRadius:10, padding:'9px', fontSize:13, fontWeight:600, color:C.ink, cursor:'pointer', fontFamily:'inherit' }}>
              {busy ? 'Uploading…' : 'Replace photo'}
            </button>
            <button
              type="button"
              onClick={handleRemove}
              disabled={busy}
              style={{ background:'none', border:`1px solid ${C.border}`, borderRadius:10, padding:'9px 14px', fontSize:13, color:C.muted, cursor:'pointer', fontFamily:'inherit' }}>
              Remove
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={()=>inputRef.current?.click()}
          disabled={busy}
          style={{
            width:'100%', background:C.bg, border:`2px dashed ${C.border}`, borderRadius:13,
            padding:'26px 16px', cursor: busy ? 'default' : 'pointer', fontFamily:'inherit',
            display:'flex', flexDirection:'column', alignItems:'center', gap:7,
          }}>
          <span style={{ fontSize:26 }}>{busy ? '⏳' : '📷'}</span>
          <span style={{ fontSize:14, fontWeight:600, color:C.ink }}>
            {busy ? 'Uploading…' : 'Add a photo'}
          </span>
          <span style={{ fontSize:12, color:C.muted, textAlign:'center', lineHeight:1.5, maxWidth:260 }}>
            A shot of your storefront, counter, or best-selling item. This is the first
            thing customers see.
          </span>
        </button>
      )}

      {error && (
        <div style={{ marginTop:9, background:'#FEF2F2', border:'1px solid #FECACA', borderRadius:10, padding:'9px 12px', fontSize:12.5, color:'#DC2626' }}>
          ⚠ {error}
        </div>
      )}
    </div>
  )
}
