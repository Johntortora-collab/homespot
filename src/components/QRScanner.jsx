import { useEffect, useRef, useState } from 'react'

const C = {
  bg:'#13131F', card:'#1E1E30', amber:'#F5A623',
  border:'rgba(255,255,255,0.07)', dim:'rgba(255,255,255,0.45)',
}

/**
 * Full-screen camera QR scanner.
 * Calls onScan(spotId) once a valid Homespot QR is decoded.
 * Calls onClose() when the user backs out.
 *
 * Expects QR content shaped like: https://yourdomain.com/scan/{spotId}
 * Falls back to treating any decoded text as a raw spot id if no URL pattern matches,
 * so it still works in local dev across different ports/hosts.
 */
export default function QRScanner({ onScan, onClose }) {
  const videoRef  = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)
  const rafRef     = useRef(null)

  const [status, setStatus] = useState('requesting') // requesting | scanning | denied | error | found
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    let active = true

    async function start() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' }, // rear camera on phones
        })
        if (!active) {
          stream.getTracks().forEach(t => t.stop())
          return
        }
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play()
        }
        setStatus('scanning')
        tick()
      } catch (err) {
        if (!active) return
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          setStatus('denied')
        } else {
          setStatus('error')
          setErrorMsg(err.message || 'Could not access camera')
        }
      }
    }

    async function tick() {
      if (!active) return
      const video  = videoRef.current
      const canvas = canvasRef.current
      if (video && canvas && video.readyState === video.HAVE_ENOUGH_DATA) {
        canvas.width  = video.videoWidth
        canvas.height = video.videoHeight
        const ctx = canvas.getContext('2d', { willReadFrequently: true })
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)

        const jsQR = (await import('jsqr')).default
        const code = jsQR(imageData.data, imageData.width, imageData.height)

        if (code && code.data) {
          const spotId = extractSpotId(code.data)
          if (spotId) {
            setStatus('found')
            stopCamera()
            onScan(spotId)
            return
          }
        }
      }
      rafRef.current = requestAnimationFrame(tick)
    }

    start()

    return () => {
      active = false
      stopCamera()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function stopCamera() {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
  }

  function extractSpotId(text) {
    // Matches .../scan/{uuid} in any domain (works across dev ports + prod domain)
    const match = text.match(/\/scan\/([a-f0-9-]{36})/i)
    if (match) return match[1]
    // Fallback: if the QR just contains a bare UUID (useful for manual testing)
    if (/^[a-f0-9-]{36}$/i.test(text.trim())) return text.trim()
    return null
  }

  function handleClose() {
    stopCamera()
    onClose()
  }

  return (
    <div style={{ position:'fixed', inset:0, background:'#000', zIndex:200, display:'flex', flexDirection:'column' }}>
      {/* Video feed */}
      <video ref={videoRef} playsInline muted style={{ position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'cover', display: status==='scanning'||status==='found' ? 'block' : 'none' }} />
      <canvas ref={canvasRef} style={{ display:'none' }} />

      {/* Top bar */}
      <div style={{ position:'relative', zIndex:2, display:'flex', alignItems:'center', justifyContent:'space-between', padding:'env(safe-area-inset-top, 16px) 16px 12px', background:'linear-gradient(180deg, rgba(0,0,0,0.6), transparent)' }}>
        <button onClick={handleClose} style={{ background:'rgba(255,255,255,0.15)', border:'none', color:'#fff', fontSize:13, padding:'8px 16px', borderRadius:20, cursor:'pointer', fontFamily:'Inter,sans-serif' }}>
          ✕ Close
        </button>
        <div style={{ fontFamily:'Fraunces,serif', fontSize:15, color:'#fff', fontWeight:600 }}>Scan Spot QR</div>
        <div style={{ width:70 }} />
      </div>

      {/* Scanning frame overlay */}
      {status === 'scanning' && (
        <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', zIndex:1, pointerEvents:'none' }}>
          <div style={{ width:240, height:240, position:'relative' }}>
            {[
              { top:0, left:0, borderWidth:'4px 0 0 4px', borderRadius:'16px 0 0 0' },
              { top:0, right:0, borderWidth:'4px 4px 0 0', borderRadius:'0 16px 0 0' },
              { bottom:0, left:0, borderWidth:'0 0 4px 4px', borderRadius:'0 0 0 16px' },
              { bottom:0, right:0, borderWidth:'0 4px 4px 0', borderRadius:'0 0 16px 0' },
            ].map((corner, i) => (
              <div key={i} style={{ position:'absolute', width:40, height:40, borderColor:C.amber, borderStyle:'solid', ...corner }} />
            ))}
            <div style={{ position:'absolute', left:0, right:0, top:'50%', height:2, background:C.amber, opacity:0.8, animation:'scanline 2s ease-in-out infinite', boxShadow:`0 0 12px ${C.amber}` }} />
          </div>
        </div>
      )}

      {/* Bottom instruction / status panel */}
      <div style={{ position:'relative', zIndex:2, marginTop:'auto', padding:'24px 24px max(24px, env(safe-area-inset-bottom))', background:'linear-gradient(0deg, rgba(0,0,0,0.75), transparent)' }}>
        {status === 'requesting' && (
          <Centered>
            <div style={{ fontSize:32, marginBottom:10 }}>📷</div>
            <div style={{ color:'#fff', fontFamily:'Fraunces,serif', fontSize:16 }}>Requesting camera access…</div>
          </Centered>
        )}

        {status === 'scanning' && (
          <Centered>
            <div style={{ color:'#fff', fontFamily:'Inter,sans-serif', fontSize:14 }}>Point your camera at the Spot QR code</div>
          </Centered>
        )}

        {status === 'found' && (
          <Centered>
            <div style={{ fontSize:32, marginBottom:8 }}>✦</div>
            <div style={{ color:C.amber, fontFamily:'Fraunces,serif', fontSize:16, fontWeight:600 }}>Got it!</div>
          </Centered>
        )}

        {status === 'denied' && (
          <Centered>
            <div style={{ fontSize:32, marginBottom:10 }}>🔒</div>
            <div style={{ color:'#fff', fontFamily:'Fraunces,serif', fontSize:16, marginBottom:6 }}>Camera access needed</div>
            <div style={{ color:'rgba(255,255,255,0.6)', fontFamily:'Inter,sans-serif', fontSize:13, lineHeight:1.5, marginBottom:16 }}>
              Homespot needs your camera to scan Spot QR codes. Enable camera access in your browser settings, then try again.
            </div>
            <button onClick={handleClose} style={{ background:C.amber, border:'none', borderRadius:20, padding:'10px 24px', fontSize:14, fontWeight:600, color:'#1A1A2E', cursor:'pointer' }}>
              Go back
            </button>
          </Centered>
        )}

        {status === 'error' && (
          <Centered>
            <div style={{ fontSize:32, marginBottom:10 }}>⚠️</div>
            <div style={{ color:'#fff', fontFamily:'Fraunces,serif', fontSize:16, marginBottom:6 }}>Camera unavailable</div>
            <div style={{ color:'rgba(255,255,255,0.6)', fontFamily:'Inter,sans-serif', fontSize:13, lineHeight:1.5, marginBottom:16 }}>{errorMsg}</div>
            <button onClick={handleClose} style={{ background:C.amber, border:'none', borderRadius:20, padding:'10px 24px', fontSize:14, fontWeight:600, color:'#1A1A2E', cursor:'pointer' }}>
              Go back
            </button>
          </Centered>
        )}
      </div>

      <style>{`
        @keyframes scanline {
          0%, 100% { transform: translateY(-90px); }
          50% { transform: translateY(90px); }
        }
      `}</style>
    </div>
  )
}

function Centered({ children }) {
  return <div style={{ textAlign:'center', maxWidth:300, margin:'0 auto' }}>{children}</div>
}
