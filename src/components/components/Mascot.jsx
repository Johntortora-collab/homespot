import { TOTAL_LAYERS } from '../lib/mascotEngine'

// ── Mascot renderer ───────────────────────────────────────────────────────────
// Pure rendering component. Takes a mascot config (from mascotEngine) + current
// stamp count, and draws the layered SVG character. No state of its own.

export default function Mascot({ mascot, stamps, size = 200, customerName = "" }) {
  const unlocked = Math.min(stamps, TOTAL_LAYERS)
  const { bodyShape, bodyColor, accentColor } = mascot

  return (
    <svg width={size} height={size} viewBox="0 0 200 200">
      <defs>
        <radialGradient id={`glow-${bodyShape}`} cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor={bodyColor} stopOpacity="0.25"/>
          <stop offset="100%" stopColor={bodyColor} stopOpacity="0"/>
        </radialGradient>
      </defs>

      {unlocked > 0 && <circle cx="100" cy="100" r="95" fill={`url(#glow-${bodyShape})`} />}

      {unlocked >= 1 && <BodyShape shape={bodyShape} color={bodyColor} accent={accentColor} />}
      {unlocked >= 2 && <Outfit shape={bodyShape} accent={accentColor} />}
      {unlocked >= 3 && <PrimaryAccessory shape={bodyShape} />}

      {unlocked >= 1 && <Face happy={unlocked >= 4} />}

      {unlocked >= 5 && <SecondaryDetail shape={bodyShape} />}
      {unlocked >= 6 && <Badge />}
      {unlocked >= 7 && <NameTag name={customerName || "Friend"} />}
      {unlocked >= 8 && <Celebration />}
    </svg>
  )
}

// ── Body shapes (3 silhouettes shared across categories) ─────────────────────
function BodyShape({ shape, color, accent }) {
  if (shape === "burger") {
    return (
      <g>
        <ellipse cx="100" cy="95" rx="55" ry="48" fill={color} />
        <ellipse cx="100" cy="75" rx="50" ry="30" fill={accent} />
        {[[80,62],[100,55],[120,62],[90,68],[110,68]].map(([x,y],i)=>(
          <ellipse key={i} cx={x} cy={y} rx="2.5" ry="1.5" fill="#FDF6E3" />
        ))}
        <rect x="50" y="120" width="100" height="20" rx="10" fill={color} />
      </g>
    )
  }
  if (shape === "bread") {
    return (
      <g>
        <ellipse cx="100" cy="100" rx="58" ry="50" fill={color} />
        <path d="M55 95 Q100 70 145 95" stroke={accent} strokeWidth="3" fill="none" strokeLinecap="round"/>
        <path d="M60 110 Q100 88 140 110" stroke={accent} strokeWidth="3" fill="none" strokeLinecap="round"/>
      </g>
    )
  }
  if (shape === "bean") {
    return (
      <g>
        <ellipse cx="100" cy="100" rx="50" ry="58" fill={color} />
        <ellipse cx="85" cy="80" rx="10" ry="14" fill={accent} opacity="0.5" transform="rotate(-20 85 80)"/>
      </g>
    )
  }
  if (shape === "scissors") {
    return (
      <g>
        <circle cx="100" cy="100" r="50" fill="#F5D6A8" />
        <path d="M60 70 L80 95 L60 120" stroke={color} strokeWidth="10" fill="none" strokeLinecap="round"/>
        <path d="M140 70 L120 95 L140 120" stroke={color} strokeWidth="10" fill="none" strokeLinecap="round"/>
      </g>
    )
  }
  return null
}

// ── Outfit (layer 2) ───────────────────────────────────────────────────────────
function Outfit({ shape, accent }) {
  if (shape === "burger") return (
    <g>
      <path d="M65 130 Q100 120 135 130 L135 155 Q100 165 65 155 Z" fill="#fff" stroke="#E5E5E5" strokeWidth="1"/>
      <rect x="92" y="128" width="16" height="14" fill="#E05555" rx="2"/>
    </g>
  )
  if (shape === "bread") return (
    <g>
      <rect x="60" y="125" width="80" height="22" rx="8" fill="#fff"/>
      <circle cx="100" cy="136" r="4" fill={accent}/>
    </g>
  )
  if (shape === "bean") return (
    <g>
      <path d="M65 135 Q100 145 135 135 L130 165 Q100 172 70 165 Z" fill="#3D2817"/>
    </g>
  )
  if (shape === "scissors") return (
    <g>
      <path d="M70 130 Q100 145 130 130 L135 160 Q100 175 65 160 Z" fill={accent}/>
    </g>
  )
  return null
}

// ── Primary accessory (layer 3) ───────────────────────────────────────────────
function PrimaryAccessory({ shape }) {
  if (shape === "burger") return (
    <g transform="translate(140,40) rotate(15)">
      <rect x="-3" y="0" width="6" height="35" fill="#888" rx="2"/>
      <rect x="-12" y="30" width="24" height="10" fill="#AAA" rx="3"/>
    </g>
  )
  if (shape === "bread") return (
    <g>
      <ellipse cx="100" cy="48" rx="38" ry="18" fill="#fff" stroke="#E5DDD0" strokeWidth="1.5"/>
      <rect x="70" y="38" width="60" height="16" rx="8" fill="#fff" stroke="#E5DDD0" strokeWidth="1.5"/>
    </g>
  )
  if (shape === "bean") return (
    <g>
      {[0,1,2].map(i=>(
        <path key={i} d={`M${78+i*12} 35 Q${72+i*12} 22 ${78+i*12} 12`} stroke="#fff" strokeWidth="3" fill="none" strokeLinecap="round" opacity="0.6"/>
      ))}
    </g>
  )
  if (shape === "scissors") return (
    <g transform="translate(145,90) rotate(30)">
      <rect x="-3" y="-20" width="6" height="40" fill="#444" rx="2"/>
      {Array.from({length:6}).map((_,i)=>(
        <rect key={i} x={-3+i*1.5-4} y={-15+i*5} width="11" height="2" fill="#444"/>
      ))}
    </g>
  )
  return null
}

// ── Face (layer 1, expression upgrades at layer 4) ────────────────────────────
function Face({ happy }) {
  return (
    <g>
      <circle cx="82" cy="98" r="5" fill="#2A2A2A"/>
      <circle cx="118" cy="98" r="5" fill="#2A2A2A"/>
      {happy ? (
        <path d="M78 115 Q100 132 122 115" stroke="#2A2A2A" strokeWidth="4" fill="none" strokeLinecap="round"/>
      ) : (
        <path d="M82 118 Q100 122 118 118" stroke="#2A2A2A" strokeWidth="4" fill="none" strokeLinecap="round"/>
      )}
      {happy && <>
        <circle cx="68" cy="106" r="6" fill="#FF9999" opacity="0.5"/>
        <circle cx="132" cy="106" r="6" fill="#FF9999" opacity="0.5"/>
      </>}
    </g>
  )
}

// ── Secondary detail (layer 5) ────────────────────────────────────────────────
function SecondaryDetail({ shape }) {
  const items = {
    burger:   <g transform="translate(45,150)"><rect width="14" height="18" rx="3" fill="#E8B84B"/><rect x="2" y="3" width="3" height="12" fill="#fff"/><rect x="6" y="3" width="3" height="12" fill="#fff"/><rect x="10" y="3" width="3" height="12" fill="#fff"/></g>,
    bread:    <g transform="translate(140,150)"><ellipse cx="0" cy="8" rx="9" ry="6" fill="#fff" stroke="#DDD"/><path d="M-7 8 Q0 -2 7 8" stroke="#DDD" fill="none" strokeWidth="1.5"/></g>,
    bean:     <g transform="translate(50,150)"><ellipse cx="0" cy="0" rx="14" ry="10" fill="#3D2817"/><ellipse cx="0" cy="-2" rx="10" ry="6" fill="#D4A574"/></g>,
    scissors: <g transform="translate(145,150)"><rect x="-10" y="0" width="20" height="26" rx="3" fill="#E0C8E8" stroke="#9B6B9B"/></g>,
  }
  return items[shape] || null
}

// ── Badge (layer 6) ───────────────────────────────────────────────────────────
function Badge() {
  return (
    <g transform="translate(55,135)">
      <circle r="13" fill="#F5A623"/>
      <circle r="13" fill="none" stroke="#fff" strokeWidth="2"/>
      <path d="M-5 0 L-1 5 L6 -5" stroke="#fff" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
    </g>
  )
}

// ── Name tag (layer 7) ────────────────────────────────────────────────────────
function NameTag({ name }) {
  return (
    <g transform="translate(100,178)">
      <rect x="-38" y="-9" width="76" height="18" rx="9" fill="#fff" stroke="#E5E5E5"/>
      <text x="0" y="4" textAnchor="middle" fontSize="11" fontFamily="Fraunces, serif" fontWeight="600" fill="#333">{name}</text>
    </g>
  )
}

// ── Celebration (layer 8) ─────────────────────────────────────────────────────
function Celebration() {
  return (
    <g>
      <g transform="translate(100,38)">
        <path d="M-22 8 L-14 -12 L-4 4 L0 -16 L4 4 L14 -12 L22 8 Z" fill="#FFD700" stroke="#E8B800" strokeWidth="1.5"/>
        <circle cx="0" cy="-16" r="3" fill="#FF6B6B"/>
      </g>
      {[[30,60],[170,55],[20,140],[180,135]].map(([x,y],i)=>(
        <g key={i} transform={`translate(${x},${y})`}>
          <path d="M0 -8 L2 -2 L8 0 L2 2 L0 8 L-2 2 L-8 0 L-2 -2 Z" fill="#F5A623"/>
        </g>
      ))}
    </g>
  )
}
