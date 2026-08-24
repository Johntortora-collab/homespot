import { useEffect, useRef, useState } from 'react'

const C = {
  bg:'#13131F', card:'#1E1E30', card2:'#252538', amber:'#F5A623',
  border:'rgba(255,255,255,0.08)', dim:'rgba(255,255,255,0.45)',
}

/**
 * Map view for Main Street.
 *
 * Leaflet is loaded on demand rather than imported at the top of the bundle —
 * most sessions never open the map, and it's a chunky dependency to ship to
 * everyone for a view they didn't ask for.
 *
 * Markers are divIcons (styled HTML) rather than Leaflet's default pin. That's
 * partly so they can carry the business emoji, and partly because the default
 * marker loads its images by relative path and quietly breaks under Vite's
 * asset hashing — a classic afternoon lost to invisible markers.
 */
export default function SpotsMap({ spots, town, onSpot }) {
  const containerRef = useRef(null)
  const mapRef       = useRef(null)
  const [ready,    setReady]    = useState(false)
  const [selected, setSelected] = useState(null)

  const placed = spots.filter(s => Number.isFinite(s.lat) && Number.isFinite(s.lng))

  useEffect(() => {
    let cancelled = false

    ;(async () => {
      const L = (await import('leaflet')).default
      await import('leaflet/dist/leaflet.css')
      if (cancelled || !containerRef.current || mapRef.current) return

      const map = L.map(containerRef.current, {
        zoomControl: false,
        attributionControl: true,
      })
      mapRef.current = map

      // Dark tiles so the map doesn't glare white inside a dark app. Carto's
      // basemaps are free for this kind of use; the attribution is required
      // and must stay visible.
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap, &copy; CARTO',
        maxZoom: 19,
      }).addTo(map)

      L.control.zoom({ position: 'bottomright' }).addTo(map)

      if (placed.length > 0) {
        placed.forEach(s => {
          const icon = L.divIcon({
            className: '',
            html: `<div style="
              width:38px;height:38px;border-radius:50%;
              background:${s.color || C.amber};
              border:2.5px solid #13131F;
              box-shadow:0 3px 10px rgba(0,0,0,0.55);
              display:flex;align-items:center;justify-content:center;
              font-size:18px;line-height:1;">${s.emoji || '🏪'}</div>`,
            iconSize: [38, 38],
            iconAnchor: [19, 19],
          })
          L.marker([s.lat, s.lng], { icon })
            .addTo(map)
            .on('click', () => setSelected(s))
        })

        const bounds = L.latLngBounds(placed.map(s => [s.lat, s.lng]))
        // padding stops a marker at the edge sitting half under the card that
        // slides up when you tap one
        map.fitBounds(bounds, { padding: [50, 90], maxZoom: 16 })
      } else {
        // Nothing placed yet — sit on the town so the view isn't a grey void.
        map.setView([40.6215, -74.3096], 13)
      }

      setReady(true)
    })()

    return () => {
      cancelled = true
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spots])

  return (
    <div style={{ position:'relative', height:'100%', background:C.card2 }}>
      <div ref={containerRef} style={{ position:'absolute', inset:0 }} />

      {!ready && (
        <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', color:C.dim, fontSize:13 }}>
          Loading map…
        </div>
      )}

      {/* Placed-count notice. Without it, a town where nobody has been geocoded
          looks like a broken map rather than one waiting on data. */}
      {ready && placed.length < spots.length && (
        <div style={{ position:'absolute', top:12, left:12, right:12, zIndex:500, background:'rgba(19,19,31,0.9)', border:`1px solid ${C.border}`, borderRadius:11, padding:'9px 12px', fontSize:11.5, color:C.dim, lineHeight:1.45 }}>
          {placed.length === 0
            ? `None of the ${spots.length} businesses in ${town?.name || 'this town'} are on the map yet.`
            : `${placed.length} of ${spots.length} businesses placed — the rest are in the list view.`}
        </div>
      )}

      {/* Tapped marker: a card over the map rather than a Leaflet popup, so it
          matches the rest of the app and gives a real tap target. */}
      {selected && (
        <div style={{ position:'absolute', left:12, right:12, bottom:12, zIndex:500, background:C.card, border:`1px solid ${C.border}`, borderRadius:16, padding:'13px 14px', boxShadow:'0 12px 32px rgba(0,0,0,0.55)', animation:'up 0.22s ease' }}>
          <div style={{ display:'flex', alignItems:'center', gap:11 }}>
            <span style={{ fontSize:26, flexShrink:0 }}>{selected.emoji}</span>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontFamily:'Fraunces,serif', fontSize:15, color:'#fff', fontWeight:700, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                {selected.name}
              </div>
              <div style={{ fontSize:11, color:C.dim, marginTop:2, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                {selected.category}{selected.address ? ` · ${selected.address}` : ''}
              </div>
            </div>
            <button onClick={()=>setSelected(null)}
              style={{ background:'none', border:'none', color:'#555', fontSize:15, cursor:'pointer', padding:'0 2px', flexShrink:0 }}>
              ✕
            </button>
          </div>
          <button onClick={()=>onSpot(selected.id)}
            style={{ width:'100%', background:C.amber, border:'none', borderRadius:11, padding:'11px', fontSize:13, fontWeight:700, color:C.bg, cursor:'pointer', marginTop:11, fontFamily:'inherit' }}>
            View spot →
          </button>
        </div>
      )}

      {/* Leaflet's own styles assume a light page; these keep its chrome from
          glowing white in the middle of a dark app. */}
      <style>{`
        .leaflet-container { background:${C.card2}; font-family:Inter,sans-serif; }
        .leaflet-control-attribution {
          background:rgba(19,19,31,0.75) !important;
          color:${C.dim} !important;
          font-size:9px !important;
        }
        .leaflet-control-attribution a { color:#888 !important; }
        .leaflet-bar a {
          background:${C.card} !important;
          color:#fff !important;
          border-color:${C.border} !important;
        }
        .leaflet-bar a:hover { background:${C.card2} !important; }
      `}</style>
    </div>
  )
}
