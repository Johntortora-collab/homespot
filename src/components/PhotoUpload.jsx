import { useRef, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import ImageCropper from './ImageCropper'
import { PHOTO_ASPECT, PHOTO_SHAPES, DEFAULT_PHOTO_SHAPE, photoAspect } from '../lib/photo'

const BUCKET = 'spot-photos'

// Frame the cover is cropped to. Defined in lib/photo.js so the consumer app
// renders spot heroes at exactly the same ratio. Re-exported for callers that
// already import it from here.
export { PHOTO_ASPECT }

const COVER_EDGE      = 1400  // px wide, the file customers download
const COVER_QUALITY   = 0.82
const ORIGINAL_EDGE   = 2400  // px on the long side, kept for re-cropping
const ORIGINAL_QUALITY = 0.9

/**
 * Owner-facing photo picker for a business storefront shot.
 *
 * Used in both the onboarding wizard (before the spot row exists) and the
 * dashboard settings page (after), which is why it deals in plain URLs rather
 * than a spot id — the caller decides where they end up.
 *
 * Files land at {user_id}/{uuid}.jpg and {user_id}/{uuid}-original.jpg. That
 * folder prefix is load-bearing: the storage RLS policy checks it, so an owner
 * can only write inside their own folder. Don't flatten the path.
 *
 * Two files per photo. The cropped cover is what customers download; the
 * original is kept so the owner can re-frame the same shot months later
 * without hunting for the file again.
 *
 * Props:
 *   value         — current cropped photo URL (or null)
 *   originalValue — current uncropped photo URL (or null)
 *   crop          — saved framing {x, y, zoom} (or null)
 *   onChange      — onChange(url, meta) where meta is
 *                   { original_url, crop } or null when removed.
 *                   Callers that only take the first argument still work.
 *   shape         — stored shape key: 'wide' | 'square' | 'tall'
 *   onShapeChange — onShapeChange(key). Omit it and the picker is hidden,
 *                   which is what a caller that can't persist a shape wants.
 *   aspect        — explicit ratio override. Normally leave this alone and let
 *                   it follow `shape`.
 *   colors        — palette override so this fits both owner surfaces
 */
export default function PhotoUpload({
  value,
  originalValue = null,
  crop = null,
  onChange,
  shape = DEFAULT_PHOTO_SHAPE,
  onShapeChange = null,
  aspect,
  colors = {},
}) {
  const activeAspect = aspect ?? photoAspect(shape)
  const C = {
    bg:     '#FDF8F2',
    card:   '#FFFFFF',
    border: '#E8E3DC',
    ink:    '#1A1A2E',
    muted:  '#6B7280',
    amber:  '#F5A623',
    amberSoft: '#FEF3DC',
    ...colors,
  }

  const inputRef = useRef(null)
  const objectUrlRef = useRef(null)

  const [busy,    setBusy]    = useState(false)
  const [error,   setError]   = useState('')
  const [editing, setEditing] = useState(null)
  // editing = { src, originalBlob | null, initialCrop | null }
  //   originalBlob set  → brand new upload, both files get written
  //   originalBlob null → re-framing a photo already in storage, cover only

  useEffect(() => () => {
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
  }, [])

  function releaseObjectUrl() {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current)
      objectUrlRef.current = null
    }
  }

  // Phone cameras produce 3–8MB files. Uploading those raw is slow on a shop's
  // wifi and pointless. Downscale and re-encode before anything hits the
  // network — but keep the original generous enough that zooming in while
  // cropping doesn't turn to mush.
  async function downscale(file, maxEdge, quality) {
    const bitmap = await createImageBitmap(file)
    const scale  = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height))
    const w = Math.round(bitmap.width  * scale)
    const h = Math.round(bitmap.height * scale)

    const canvas = document.createElement('canvas')
    canvas.width  = w
    canvas.height = h
    canvas.getContext('2d').drawImage(bitmap, 0, 0, w, h)
    bitmap.close?.()

    const blob = await new Promise(res => canvas.toBlob(res, 'image/jpeg', quality))
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
    if (file.size > 25 * 1024 * 1024) {
      setError('That image is too large. Try one under 25MB.')
      return
    }

    setBusy(true)
    try {
      const originalBlob = await downscale(file, ORIGINAL_EDGE, ORIGINAL_QUALITY)
      releaseObjectUrl()
      objectUrlRef.current = URL.createObjectURL(originalBlob)
      setEditing({ src: objectUrlRef.current, originalBlob, initialCrop: null })
    } catch (err) {
      setError(err.message || 'Could not read that image.')
    } finally {
      setBusy(false)
    }
  }

  function handleAdjust() {
    setError('')
    if (!originalValue) {
      setError('This photo was added before adjusting was available. Replace it to enable adjusting.')
      return
    }
    setEditing({ src: originalValue, originalBlob: null, initialCrop: crop })
  }

  // Switching shape changes what the stored cover has to be, not just how it's
  // displayed. Re-open the cropper at the new ratio so the saved file matches —
  // otherwise the browser crops the old cover a second time and the owner's
  // framing is lost. When there's no original to re-cut, the shape still
  // changes and the cover is squeezed by object-fit; say so rather than
  // silently producing a worse image.
  function handleShape(key) {
    if (key === shape) return
    setError('')
    onShapeChange?.(key)

    if (!value) return
    if (originalValue) {
      setEditing({ src: originalValue, originalBlob: null, initialCrop: null })
    } else {
      setError('Shape changed, but this photo has no original to re-cut — replace it to frame it properly.')
    }
  }

  async function handleCropSave({ crop: nextCrop, blob: coverBlob }) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('You need to be signed in to upload a photo.')

    const id = crypto.randomUUID()
    const coverPath = `${user.id}/${id}.jpg`

    const { error: coverErr } = await supabase.storage
      .from(BUCKET)
      .upload(coverPath, coverBlob, { contentType: 'image/jpeg', upsert: false })
    if (coverErr) throw coverErr

    const coverUrl = publicUrl(coverPath)

    let nextOriginalUrl = originalValue

    if (editing?.originalBlob) {
      const originalPath = `${user.id}/${id}-original.jpg`
      const { error: origErr } = await supabase.storage
        .from(BUCKET)
        .upload(originalPath, editing.originalBlob, {
          contentType: 'image/jpeg', upsert: false,
        })
      // An original that fails to store isn't fatal — the cover is already up
      // and the listing looks right. It only costs the ability to re-frame.
      if (!origErr) nextOriginalUrl = publicUrl(originalPath)

      // Replacing the photo entirely, so the previous original goes too.
      removeStored(originalValue, user.id)
    }

    // Best-effort cleanup of the cover being replaced. Failure here is
    // cosmetic (an orphaned file), so it must not block the save.
    removeStored(value, user.id)

    releaseObjectUrl()
    setEditing(null)
    onChange(coverUrl, { original_url: nextOriginalUrl, crop: nextCrop })
  }

  function publicUrl(path) {
    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
    if (!data?.publicUrl) throw new Error('Upload finished but no URL came back.')
    return data.publicUrl
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
    if (user) {
      removeStored(value, user.id)
      removeStored(originalValue, user.id)
    }
    onChange(null, null)
    setError('')
  }

  function handleCancelCrop() {
    releaseObjectUrl()
    setEditing(null)
  }

  const btn = {
    borderRadius: 10, padding: '9px', fontSize: 13, fontWeight: 600,
    cursor: 'pointer', fontFamily: 'inherit',
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
        onChange={handleFile}
        style={{ display: 'none' }}
      />

      {onShapeChange && (
        <div style={{ marginBottom: 10 }}>
          <div style={{ display: 'flex', gap: 7 }}>
            {PHOTO_SHAPES.map(s => {
              const on = s.key === shape
              return (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => handleShape(s.key)}
                  disabled={busy}
                  style={{
                    flex: 1, background: on ? C.amberSoft || '#FEF3DC' : C.bg,
                    border: `1.5px solid ${on ? C.amber : C.border}`,
                    borderRadius: 10, padding: '8px 6px', cursor: busy ? 'default' : 'pointer',
                    fontFamily: 'inherit', display: 'flex', flexDirection: 'column',
                    alignItems: 'center', gap: 5, transition: 'all 0.15s',
                  }}>
                  <span style={{
                    display: 'block', width: 22, borderRadius: 3,
                    aspectRatio: String(s.ratio),
                    background: on ? C.amber : C.border,
                  }} />
                  <span style={{
                    fontSize: 11.5, fontWeight: on ? 600 : 400,
                    color: on ? C.ink : C.muted,
                  }}>{s.label}</span>
                </button>
              )
            })}
          </div>
          <div style={{ fontSize: 11.5, color: C.muted, marginTop: 6, lineHeight: 1.5 }}>
            {PHOTO_SHAPES.find(s => s.key === shape)?.hint}
          </div>
        </div>
      )}

      {value ? (
        <div style={{ position:'relative', borderRadius:13, overflow:'hidden', border:`1px solid ${C.border}` }}>
          <img
            src={value}
            alt="Your business"
            style={{ display:'block', width:'100%', aspectRatio:String(activeAspect), objectFit:'cover', background:C.bg }}
          />
          <div style={{ display:'flex', gap:8, padding:10, background:C.card }}>
            <button
              type="button"
              onClick={handleAdjust}
              disabled={busy}
              style={{ ...btn, flex:1, background:C.amber, border:'none', color:C.ink }}>
              Adjust
            </button>
            <button
              type="button"
              onClick={()=>inputRef.current?.click()}
              disabled={busy}
              style={{ ...btn, flex:1, background:C.bg, border:`1px solid ${C.border}`, color:C.ink }}>
              {busy ? 'Preparing…' : 'Replace'}
            </button>
            <button
              type="button"
              onClick={handleRemove}
              disabled={busy}
              style={{ ...btn, background:'none', border:`1px solid ${C.border}`, padding:'9px 14px', fontWeight:400, color:C.muted }}>
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
            {busy ? 'Preparing…' : 'Add a photo'}
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

      {editing && (
        <ImageCropper
          src={editing.src}
          aspect={activeAspect}
          initial={editing.initialCrop}
          outputWidth={COVER_EDGE}
          quality={COVER_QUALITY}
          title={editing.originalBlob ? 'Frame your photo' : 'Adjust photo'}
          onCancel={handleCancelCrop}
          onSave={handleCropSave}
        />
      )}
    </div>
  )
}
