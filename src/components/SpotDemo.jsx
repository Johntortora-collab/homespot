/**
 * SpotDemo — the "here's what it actually does" walkthrough shown on a draft
 * listing's preview page (/preview/:spotId).
 *
 * An owner scanning the flyer QR has never seen the app. The listing card above
 * proves we have their business; this proves the app does something. Every mock
 * screen is rendered with THEIR name, photo, emoji, colour, perk and stamp
 * count, so they are looking at their own shop rather than a generic demo.
 *
 * Screens are hand-built copies of the real UI, not screenshots: screenshots
 * can't be personalised, go stale, and look wrong at phone widths. Customer
 * screens use the ConsumerApp dark palette, owner screens use the
 * OwnerDashboard cream palette, both copied from those files.
 *
 * Every number here is invented. Anything showing counts carries a "Sample"
 * tag — an owner who launches and finds 0 visits should never feel misled.
 */

import { spotPhotoAspect } from '../lib/photo'

// ConsumerApp palette
const C = {
  bg: '#13131F', card: '#1E1E30', card2: '#252538',
  amber: '#F5A623', amberDim: 'rgba(245,166,35,0.12)', amberBrd: 'rgba(245,166,35,0.25)',
  sage: '#7BA05B', dim: 'rgba(255,255,255,0.45)', border: 'rgba(255,255,255,0.07)',
}

// OwnerDashboard palette
const O = {
  bg: '#FDF8F2', card: '#FFFFFF', navy: '#1A1A2E',
  amber: '#F5A623', amberSoft: '#FEF3DC',
  sage: '#7BA05B', sageSoft: '#EDF4E8',
  rose: '#E8956D', roseSoft: '#FDF0EA',
  purple: '#9B6B9B',
  ink: '#1A1A2E', mid: '#6B7280', muted: '#9CA3AF', border: '#E8E3DC',
}

// Invented people. Kept plain so nobody reads them as real customers.
const PEOPLE = [
  { name: 'Maria R.',  avatar: '🧑', visits: 24, stamps: 6, last: 'Today' },
  { name: 'Dave K.',   avatar: '🧔', visits: 11, stamps: 3, last: 'Yesterday' },
  { name: 'Jen P.',    avatar: '👩', visits: 7,  stamps: 5, last: '2 days ago' },
  { name: 'Tom A.',    avatar: '👨', visits: 3,  stamps: 2, last: 'Last week' },
]

export default function SpotDemo({ spot }) {
  const accent   = spot.color || C.amber
  const total    = spot.stamps_required || 8
  const perk     = spot.perk || 'a free item'
  const shortName = spot.name.length > 22 ? spot.name.slice(0, 21) + '…' : spot.name
  const firstWord = spot.name.split(' ')[0]

  return (
    <div style={{ marginBottom: 22 }}>
      <style>{`
        .hsd-scroll::-webkit-scrollbar{display:none}
        .hsd-scroll{scrollbar-width:none;-ms-overflow-style:none}
      `}</style>

      {/* ── CUSTOMER SIDE ───────────────────────────────────────────────── */}
      <SectionHead
        kicker="For your customers"
        title="What people in town see"
        sub={`A free app on their phone. No card to carry, nothing for you to reprint.`}
      />

      <Step
        n={1}
        title="They find you on Main Street"
        body={`Every Homespot user in ${spot.town_name} browsing local businesses sees your listing — photo, name and how far along their card is.`}
      >
        <Phone>
          <MainStreetScreen spot={spot} accent={accent} total={total} shortName={shortName} />
        </Phone>
      </Step>

      <Step
        n={2}
        title="Your page, with your details"
        body="Address taps open directions, the phone number dials, hours are right there. Under it, their stamp card for your shop."
      >
        <Phone>
          <SpotPageScreen spot={spot} accent={accent} total={total} perk={perk} />
        </Phone>
      </Step>

      <Step
        n={3}
        title="They scan your QR at the counter"
        body="One scan adds a stamp. It takes a second, it happens on their phone, and there is nothing for your staff to punch, sign or hand over."
      >
        <Phone>
          <StampedScreen accent={accent} total={total} />
        </Phone>
      </Step>

      <Step
        n={4}
        title={`The reward brings them back`}
        body={`After ${total} visits they've earned ${perk}. It sits in their app until they come in and claim it — which is the whole point.`}
      >
        <Phone>
          <PerkReadyScreen spot={spot} accent={accent} perk={perk} total={total} />
        </Phone>
      </Step>

      {/* ── OWNER SIDE ──────────────────────────────────────────────────── */}
      <SectionHead
        kicker="For you"
        title="What you see"
        sub="Your own dashboard, on your phone or the shop computer."
      />

      <div style={{
        background: 'rgba(245,166,35,0.07)', border: `1px solid ${C.amberBrd}`,
        borderRadius: 12, padding: '11px 13px', marginBottom: 18,
        fontSize: 11.5, color: C.dim, lineHeight: 1.55,
      }}>
        <strong style={{ color: C.amber }}>Numbers below are made up</strong> — they show what the
        screens look like once you have customers. Yours start at zero on day one.
      </div>

      <Step
        n={5}
        title="Who came in today"
        body="Visits, repeat customers, stamps and rewards claimed. The strip along the top updates the moment someone scans."
      >
        <Browser sample>
          <OverviewScreen firstWord={firstWord} />
        </Browser>
      </Step>

      <Step
        n={6}
        title="Who your regulars are"
        body="Every customer, how often they come, and when they were last in. You find out who your top twenty people are — most shops are guessing."
      >
        <Browser sample>
          <CustomersScreen total={total} />
        </Browser>
      </Step>

      <Step
        n={7}
        title="Send an offer to their phones"
        body="Slow Tuesday? Write a line, pick how long it runs, send. It reaches the people who have already chosen to walk into your shop."
      >
        <Browser sample>
          <OfferScreen />
        </Browser>
      </Step>

      <Step
        n={8}
        title="Hear what they actually thought"
        body="Customers can leave a note after a visit. It comes to you, privately, instead of a public review nobody warned you about."
      >
        <Browser sample>
          <FeedbackScreen name={shortName} />
        </Browser>
      </Step>
    </div>
  )
}

/* ── LAYOUT PIECES ───────────────────────────────────────────────────────── */

function SectionHead({ kicker, title, sub }) {
  return (
    <div style={{ margin: '30px 0 18px', textAlign: 'center' }}>
      <div style={{ height: 1, background: C.border, marginBottom: 22 }} />
      <div style={{
        display: 'inline-block', background: C.amberDim, border: `1px solid ${C.amberBrd}`,
        borderRadius: 20, padding: '4px 12px', fontSize: 9.5, fontWeight: 700,
        color: C.amber, letterSpacing: '0.1em', textTransform: 'uppercase',
      }}>{kicker}</div>
      <h2 style={{
        fontFamily: 'Fraunces,serif', fontSize: 21, color: '#fff',
        fontWeight: 700, marginTop: 11, lineHeight: 1.25,
      }}>{title}</h2>
      <p style={{ fontSize: 12.5, color: C.dim, marginTop: 7, lineHeight: 1.6 }}>{sub}</p>
    </div>
  )
}

function Step({ n, title, body, children }) {
  return (
    <div style={{ marginBottom: 26 }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 13 }}>
        <div style={{
          width: 22, height: 22, borderRadius: '50%', background: C.amberDim,
          border: `1px solid ${C.amberBrd}`, color: C.amber, fontSize: 11, fontWeight: 700,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1,
        }}>{n}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: 'Fraunces,serif', fontSize: 15.5, color: '#fff', fontWeight: 700 }}>{title}</div>
          <div style={{ fontSize: 12.5, color: C.dim, lineHeight: 1.6, marginTop: 4 }}>{body}</div>
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'center' }}>{children}</div>
    </div>
  )
}

/* A phone shell. Fixed height so screens crop like a real viewport. */
function Phone({ children }) {
  return (
    <div style={{
      width: 262, background: '#08080F', borderRadius: 34, padding: 7,
      border: '1px solid rgba(255,255,255,0.09)',
      boxShadow: '0 18px 44px rgba(0,0,0,0.5)',
    }}>
      <div style={{
        position: 'relative', height: 452, borderRadius: 28, overflow: 'hidden',
        background: C.bg, display: 'flex', flexDirection: 'column',
      }}>
        <div style={{
          position: 'absolute', top: 7, left: '50%', transform: 'translateX(-50%)',
          width: 62, height: 5, borderRadius: 4, background: '#000', zIndex: 30,
        }} />
        {children}
      </div>
    </div>
  )
}

/* A browser shell for the dashboard, so it reads as "on your computer". */
function Browser({ children, sample }) {
  return (
    <div style={{
      width: '100%', maxWidth: 360, background: '#0E0E1A', borderRadius: 15, padding: 7,
      border: '1px solid rgba(255,255,255,0.09)', boxShadow: '0 18px 44px rgba(0,0,0,0.5)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '2px 4px 8px' }}>
        {['#E8956D', '#F5A623', '#7BA05B'].map(c => (
          <div key={c} style={{ width: 7, height: 7, borderRadius: '50%', background: c, opacity: 0.65 }} />
        ))}
        <div style={{ flex: 1 }} />
        {sample && (
          <div style={{
            background: 'rgba(245,166,35,0.15)', color: C.amber, fontSize: 8, fontWeight: 700,
            letterSpacing: '0.08em', padding: '2px 7px', borderRadius: 5, textTransform: 'uppercase',
          }}>Sample data</div>
        )}
      </div>
      <div style={{
        borderRadius: 10, overflow: 'hidden', background: O.bg,
        maxHeight: 404, overflowY: 'hidden',
      }}>
        {children}
      </div>
    </div>
  )
}

/* ── CUSTOMER SCREENS ────────────────────────────────────────────────────── */

function PhoneTop({ children }) {
  return (
    <div style={{ padding: '22px 14px 0', flexShrink: 0 }}>{children}</div>
  )
}

function BottomNav({ active = 'home' }) {
  const tabs = [
    { id: 'home',     label: 'Main St',  icon: '🏘️' },
    { id: 'perks',    label: 'My Spots', icon: '✦' },
    { id: 'scan',     label: '',         icon: '⬡', center: true },
    { id: 'surprise', label: 'Spot Me',  icon: '🎲' },
    { id: 'profile',  label: 'You',      icon: '◎' },
  ]
  return (
    <div style={{
      height: 54, background: '#0F0F1E', borderTop: `1px solid ${C.border}`,
      display: 'flex', alignItems: 'center', justifyContent: 'space-around',
      padding: '0 6px', flexShrink: 0,
    }}>
      {tabs.map(t => (
        <div key={t.id} style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
          background: t.center ? C.amber : 'none', borderRadius: t.center ? 12 : 0,
          width: t.center ? 38 : 'auto', height: t.center ? 38 : 'auto',
          justifyContent: 'center',
          boxShadow: t.center ? '0 4px 14px rgba(245,166,35,0.45)' : 'none',
        }}>
          <span style={{
            fontSize: t.center ? 15 : 13,
            color: t.center ? C.bg : active === t.id ? C.amber : '#444', lineHeight: 1,
          }}>{t.icon}</span>
          {!t.center && (
            <span style={{ fontSize: 7.5, color: active === t.id ? C.amber : '#444' }}>{t.label}</span>
          )}
        </div>
      ))}
    </div>
  )
}

function Thumb({ spot, size = 46 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: 9, overflow: 'hidden', flexShrink: 0,
      background: `linear-gradient(150deg,${spot.color || C.amber}22,${C.card2})`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.44,
    }}>
      {spot.photo_url
        ? <img src={spot.photo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        : (spot.emoji || '🏪')}
    </div>
  )
}

function Dots({ n, filled, color, size = 6 }) {
  return (
    <div style={{ display: 'flex', gap: 2.5 }}>
      {Array.from({ length: n }).map((_, i) => (
        <div key={i} style={{
          width: size, height: size, borderRadius: '50%',
          background: i < filled ? color : C.card2,
          border: `1px solid ${i < filled ? color : '#333'}`,
        }} />
      ))}
    </div>
  )
}

function MainStreetScreen({ spot, accent, total, shortName }) {
  const neighbours = [
    { name: 'Corner Bakery', emoji: '🥐', tagline: 'Fresh every morning', color: '#E8956D', stamps: 8, mine: 2 },
    { name: 'Third Ave Barbers', emoji: '✂️', tagline: 'Walk-ins welcome', color: '#9B6B9B', stamps: 6, mine: 0 },
  ]
  return (
    <>
      <PhoneTop>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
          <svg width={17} height={17} viewBox="0 0 32 32" fill="none">
            <circle cx="16" cy="16" r="16" fill={C.amber} />
            <path d="M16 7L24 14V25H19V19H13V25H8V14Z" fill={C.bg} />
          </svg>
          <span style={{ fontFamily: 'Fraunces,serif', fontSize: 13, fontWeight: 700, color: '#fff' }}>
            home<span style={{ color: C.amber }}>spot</span>
          </span>
          <div style={{ flex: 1 }} />
          <div style={{
            background: 'rgba(255,255,255,0.06)', border: `1px solid ${C.border}`,
            borderRadius: 12, padding: '3px 8px', fontSize: 8.5, color: C.dim,
          }}>📍 {spot.town_name}</div>
        </div>
        <h2 style={{ fontFamily: 'Fraunces,serif', fontSize: 17, color: '#fff', fontWeight: 700 }}>
          Main <span style={{ color: C.amber, fontStyle: 'italic' }}>Street</span>
        </h2>
        <div style={{ display: 'flex', gap: 5, marginTop: 9 }}>
          {['All', 'Food', 'Coffee'].map((c, i) => (
            <div key={c} style={{
              background: i === 0 ? C.amberDim : 'rgba(255,255,255,0.04)',
              border: `1px solid ${i === 0 ? C.amberBrd : C.border}`,
              borderRadius: 14, padding: '3px 9px', fontSize: 9,
              color: i === 0 ? C.amber : '#666',
            }}>{c}</div>
          ))}
        </div>
      </PhoneTop>

      <div style={{ flex: 1, overflow: 'hidden', padding: '11px 14px 0' }}>
        {/* Theirs, marked so they spot it instantly */}
        <div style={{
          background: C.card, border: `1px solid ${accent}66`, borderRadius: 12,
          padding: 8, marginBottom: 7, display: 'flex', gap: 9, alignItems: 'center',
          position: 'relative',
        }}>
          <div style={{
            position: 'absolute', top: -7, right: 9, background: accent, color: C.bg,
            fontSize: 7, fontWeight: 700, letterSpacing: '0.08em', padding: '2px 6px',
            borderRadius: 5, textTransform: 'uppercase',
          }}>Your spot</div>
          <Thumb spot={spot} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: 'Fraunces,serif', fontSize: 11.5, color: '#fff', fontWeight: 600 }}>
              {shortName}
            </div>
            <div style={{
              fontSize: 9, color: '#666', margin: '2px 0 5px',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>{spot.tagline || 'Your tagline goes here'}</div>
            <Dots n={total} filled={3} color={accent} />
          </div>
        </div>

        {neighbours.map(nb => (
          <div key={nb.name} style={{
            background: C.card, border: `1px solid ${C.border}`, borderRadius: 12,
            padding: 8, marginBottom: 7, display: 'flex', gap: 9, alignItems: 'center', opacity: 0.62,
          }}>
            <div style={{
              width: 46, height: 46, borderRadius: 9, flexShrink: 0,
              background: `linear-gradient(150deg,${nb.color}22,${C.card2})`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
            }}>{nb.emoji}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: 'Fraunces,serif', fontSize: 11.5, color: '#fff', fontWeight: 600 }}>{nb.name}</div>
              <div style={{ fontSize: 9, color: '#666', margin: '2px 0 5px' }}>{nb.tagline}</div>
              <Dots n={nb.stamps} filled={nb.mine} color={nb.color} />
            </div>
          </div>
        ))}
      </div>

      <BottomNav active="home" />
    </>
  )
}

function SpotPageScreen({ spot, accent, total, perk }) {
  const rows = []
  if (spot.address) rows.push(['📍', spot.address, 'Get directions'])
  if (spot.hours)   rows.push(['🕒', spot.hours, null])
  if (spot.phone)   rows.push(['📞', spot.phone, 'Tap to call'])
  if (rows.length === 0) rows.push(['📍', 'Your address shows here', 'Get directions'])

  return (
    <>
      <div style={{
        width: '100%', aspectRatio: String(spotPhotoAspect(spot)), maxHeight: 190,
        flexShrink: 0, position: 'relative', overflow: 'hidden',
        background: `linear-gradient(150deg,${accent}22,${C.card2})`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 42,
      }}>
        {spot.photo_url
          ? <img src={spot.photo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : (spot.emoji || '🏪')}
      </div>

      <div style={{ flex: 1, overflow: 'hidden', padding: '13px 14px 0' }}>
        <div style={{ fontFamily: 'Fraunces,serif', fontSize: 15, color: '#fff', fontWeight: 700 }}>
          {spot.name}
        </div>
        {spot.tagline && <div style={{ fontSize: 10, color: C.dim, marginTop: 2 }}>{spot.tagline}</div>}

        <div style={{
          background: C.card, border: `1px solid ${C.border}`, borderRadius: 12,
          overflow: 'hidden', margin: '11px 0',
        }}>
          {rows.slice(0, 3).map(([icon, label, sub], i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '9px 11px',
              borderTop: i === 0 ? 'none' : `1px solid ${C.border}`,
            }}>
              <span style={{ fontSize: 11, width: 14, textAlign: 'center', flexShrink: 0 }}>{icon}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 10, color: '#fff', overflow: 'hidden',
                  textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>{label}</div>
                {sub && <div style={{ fontSize: 8, color: C.dim, marginTop: 1 }}>{sub}</div>}
              </div>
              <span style={{ fontSize: 9, color: '#444' }}>›</span>
            </div>
          ))}
        </div>

        <div style={{
          background: C.card, border: `1px solid ${C.border}`, borderRadius: 13,
          padding: '13px 12px 11px',
        }}>
          <div style={{ textAlign: 'center', marginBottom: 9 }}>
            <div style={{
              fontFamily: 'Fraunces,serif', fontWeight: 700, color: '#fff', lineHeight: 1,
              display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 4,
            }}>
              <span style={{ fontSize: 32 }}>3</span>
              <span style={{ fontSize: 14, color: C.dim }}>of {total}</span>
            </div>
            <div style={{ fontSize: 9, color: '#888', marginTop: 4, fontWeight: 600 }}>
              {total - 3} more check-ins to earn your reward
            </div>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, justifyContent: 'center', marginBottom: 9 }}>
            {Array.from({ length: total }).map((_, i) => (
              <div key={i} style={{
                width: 20, height: 20, borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 9, fontWeight: 700,
                background: i < 3 ? accent : 'transparent',
                color: i < 3 ? C.bg : '#555',
                border: i < 3 ? `1px solid ${accent}` : '1.5px dashed #3a3a4a',
              }}>{i < 3 ? '✓' : i + 1}</div>
            ))}
          </div>
          <div style={{ background: C.card2, borderRadius: 20, height: 3, overflow: 'hidden', marginBottom: 6 }}>
            <div style={{
              width: `${(3 / total) * 100}%`, height: '100%',
              background: `linear-gradient(90deg,${accent},${C.amber})`, borderRadius: 20,
            }} />
          </div>
          <div style={{ fontSize: 8.5, color: '#555', textAlign: 'center' }}>Reward: {perk}</div>
        </div>
      </div>

      <BottomNav active="home" />
    </>
  )
}

function StampedScreen({ accent, total }) {
  return (
    <div style={{
      flex: 1, background: 'rgba(10,10,20,0.97)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 20px',
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{
          fontSize: 9, fontWeight: 700, color: C.amber, letterSpacing: '0.15em',
          textTransform: 'uppercase', marginBottom: 16,
        }}>Check-in added!</div>

        <div style={{ display: 'flex', justifyContent: 'center', filter: `drop-shadow(0 0 26px ${accent}55)` }}>
          <div style={{
            width: 104, height: 104, borderRadius: '50%',
            background: `linear-gradient(135deg,${accent},${C.amber})`,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            color: C.bg,
          }}>
            <div style={{ fontFamily: 'Fraunces,serif', fontSize: 36, fontWeight: 700, lineHeight: 1 }}>4</div>
            <div style={{ fontSize: 11, fontWeight: 700, opacity: 0.75, marginTop: 2 }}>of {total}</div>
          </div>
        </div>

        <div style={{
          fontFamily: 'Fraunces,serif', fontSize: 16, color: '#fff',
          fontWeight: 700, marginTop: 14,
        }}>{total - 4} more to go</div>

        <div style={{
          marginTop: 18, background: C.amber, borderRadius: 18,
          padding: '9px 24px', fontSize: 12, fontWeight: 600, color: C.bg,
          display: 'inline-block',
        }}>Nice!</div>
      </div>
    </div>
  )
}

function PerkReadyScreen({ spot, accent, perk, total }) {
  return (
    <>
      <PhoneTop>
        <div style={{
          display: 'inline-block', background: 'rgba(255,255,255,0.06)',
          border: `1px solid ${C.border}`, borderRadius: 12, padding: '3px 9px',
          fontSize: 8.5, color: C.dim, marginBottom: 5,
        }}>Your Progress</div>
        <h2 style={{ fontFamily: 'Fraunces,serif', fontSize: 18, color: '#fff', fontWeight: 700 }}>
          My <span style={{ color: C.amber, fontStyle: 'italic' }}>Spots</span>
        </h2>
        <div style={{ display: 'flex', gap: 6, marginTop: 11 }}>
          {[['42', 'Visits'], ['5', 'Stamps'], ['1', 'Ready']].map(([v, l]) => (
            <div key={l} style={{
              flex: 1, background: C.card,
              border: `1px solid ${l === 'Ready' ? C.amber : C.border}`,
              borderRadius: 10, padding: '9px 6px', textAlign: 'center',
            }}>
              <div style={{ fontFamily: 'Fraunces,serif', fontSize: 15, color: C.amber, fontWeight: 700 }}>{v}</div>
              <div style={{ fontSize: 8, color: '#666' }}>{l}</div>
            </div>
          ))}
        </div>
      </PhoneTop>

      <div style={{ flex: 1, overflow: 'hidden', padding: '13px 14px 0' }}>
        <div style={{
          fontSize: 8.5, fontWeight: 600, color: '#555', letterSpacing: '0.1em',
          textTransform: 'uppercase', marginBottom: 7,
        }}>🎁 Ready to claim</div>

        <div style={{
          background: 'linear-gradient(135deg,rgba(245,166,35,0.13),rgba(232,149,109,0.06))',
          border: '1px solid rgba(245,166,35,0.45)', borderRadius: 12,
          padding: '11px 12px', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <span style={{ fontSize: 21 }}>{spot.emoji || '🏪'}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontFamily: 'Fraunces,serif', fontSize: 11, color: '#fff',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>{spot.name}</div>
            <div style={{ fontSize: 10, color: C.amber, fontWeight: 500 }}>🎁 {perk}</div>
          </div>
          <div style={{
            background: C.amber, color: C.bg, fontSize: 9.5, fontWeight: 700,
            padding: '5px 11px', borderRadius: 16, flexShrink: 0,
          }}>Redeem</div>
        </div>

        <div style={{
          fontSize: 8.5, fontWeight: 600, color: '#555', letterSpacing: '0.1em',
          textTransform: 'uppercase', margin: '13px 0 7px',
        }}>Where you go</div>

        <div style={{
          background: C.card, border: `1px solid ${C.border}`, borderRadius: 12,
          padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <span style={{ fontSize: 19 }}>{spot.emoji || '🏪'}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{
                fontFamily: 'Fraunces,serif', fontSize: 10.5, color: '#fff',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>{spot.name}</div>
              <span style={{
                background: C.amberDim, border: `1px solid ${C.amberBrd}`, color: C.amber,
                fontSize: 6.5, fontWeight: 700, letterSpacing: '0.08em',
                padding: '2px 5px', borderRadius: 5, flexShrink: 0,
              }}>REGULAR</span>
            </div>
            <div style={{ fontSize: 8.5, color: '#555', marginTop: 2 }}>{total} visits</div>
            <div style={{ background: C.card2, borderRadius: 20, height: 3, overflow: 'hidden', marginTop: 5 }}>
              <div style={{
                width: '100%', height: '100%',
                background: `linear-gradient(90deg,${accent},${C.amber})`, borderRadius: 20,
              }} />
            </div>
          </div>
          <span style={{ fontSize: 9, color: '#444', flexShrink: 0 }}>{total}/{total}</span>
        </div>
      </div>

      <BottomNav active="perks" />
    </>
  )
}

/* ── OWNER SCREENS ───────────────────────────────────────────────────────── */

function OwnerHead({ eyebrow, title, sub }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{
        fontSize: 8, fontWeight: 700, color: O.amber, letterSpacing: '0.1em',
        textTransform: 'uppercase', marginBottom: 3,
      }}>{eyebrow}</div>
      <div style={{ fontFamily: 'Fraunces,serif', fontSize: 17, fontWeight: 700, color: O.ink, lineHeight: 1.15 }}>
        {title}
      </div>
      {sub && <div style={{ fontSize: 9.5, color: O.muted, marginTop: 3 }}>{sub}</div>}
    </div>
  )
}

function OverviewScreen({ firstWord }) {
  const week = [6, 9, 5, 11, 14, 18, 8]
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  const max = Math.max(...week)
  const stats = [
    { label: 'Visits today',     value: 12,  delta: 'today',    color: O.amber,  soft: O.amberSoft, icon: '🏠' },
    { label: 'Active customers', value: 84,  delta: 'total',    color: O.sage,   soft: O.sageSoft,  icon: '◎' },
    { label: 'Stamps this week', value: 71,  delta: 'this week', color: O.rose,  soft: O.roseSoft,  icon: '✦' },
    { label: 'Perks redeemed',   value: 19,  delta: 'all time', color: O.purple, soft: '#F5EEF5',   icon: '🎁' },
  ]
  return (
    <div style={{ padding: '16px 14px' }}>
      <OwnerHead eyebrow="Saturday, June 14" title={`Good morning, ${firstWord} 👋`} sub="Here's how your spot is doing" />

      <div style={{
        background: O.navy, borderRadius: 10, padding: '9px 12px', marginBottom: 14,
        display: 'flex', alignItems: 'center', gap: 10, overflow: 'hidden',
      }}>
        <div style={{
          fontSize: 7.5, fontWeight: 700, color: O.amber, letterSpacing: '0.1em',
          textTransform: 'uppercase', flexShrink: 0,
        }}>Live ●</div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', whiteSpace: 'nowrap', overflow: 'hidden' }}>
          <span style={{ fontSize: 11 }}>🧑</span>
          <span style={{ fontSize: 9.5, color: 'rgba(255,255,255,0.7)' }}>
            <span style={{ color: '#fff', fontWeight: 500 }}>Maria R.</span> earned a stamp
          </span>
          <span style={{ fontSize: 8.5, color: 'rgba(255,255,255,0.3)' }}>9:41 AM</span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
        {stats.map(s => (
          <div key={s.label} style={{
            background: O.card, border: `1px solid ${O.border}`, borderRadius: 11, padding: '11px 10px',
          }}>
            <div style={{
              width: 24, height: 24, background: s.soft, borderRadius: 7,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, marginBottom: 7,
            }}>{s.icon}</div>
            <div style={{ fontFamily: 'Fraunces,serif', fontSize: 19, fontWeight: 700, color: O.ink, lineHeight: 1 }}>
              {s.value}
            </div>
            <div style={{ fontSize: 8.5, color: O.mid, marginTop: 2 }}>{s.label}</div>
            <div style={{ fontSize: 7.5, color: s.color, fontWeight: 600, marginTop: 3 }}>{s.delta}</div>
          </div>
        ))}
      </div>

      <div style={{ background: O.card, border: `1px solid ${O.border}`, borderRadius: 11, padding: '13px 14px' }}>
        <div style={{ fontFamily: 'Fraunces,serif', fontSize: 12, fontWeight: 700, color: O.ink }}>
          Visits this week
        </div>
        <div style={{ fontSize: 8.5, color: O.muted, marginBottom: 11 }}>71 total</div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 62 }}>
          {week.map((v, i) => (
            <div key={i} style={{
              flex: 1, display: 'flex', flexDirection: 'column',
              alignItems: 'center', gap: 4, height: '100%',
            }}>
              <div style={{ flex: 1, width: '100%', display: 'flex', alignItems: 'flex-end' }}>
                <div style={{
                  width: '100%', height: `${(v / max) * 100}%`,
                  background: i === 5 ? O.amber : '#EAE6E0', borderRadius: '3px 3px 0 0',
                }} />
              </div>
              <div style={{ fontSize: 7.5, color: i === 5 ? O.amber : O.muted, fontWeight: i === 5 ? 700 : 400 }}>
                {days[i]}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function CustomersScreen({ total }) {
  return (
    <div style={{ padding: '16px 14px' }}>
      <OwnerHead eyebrow="84 total" title="Your Customers" sub="Everyone who has visited" />

      <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
        {[['All', true], ['⭐ VIP', false], ['Regular', false], ['🆕 New', false]].map(([f, on]) => (
          <div key={f} style={{
            background: on ? O.navy : O.card, color: on ? '#fff' : O.mid,
            border: on ? 'none' : `1px solid ${O.border}`, borderRadius: 14,
            padding: '4px 10px', fontSize: 9, fontWeight: on ? 600 : 400,
          }}>{f}</div>
        ))}
      </div>

      <div style={{ background: O.card, border: `1px solid ${O.border}`, borderRadius: 11, overflow: 'hidden' }}>
        <div style={{
          display: 'grid', gridTemplateColumns: '1.6fr 0.6fr 0.9fr 1fr',
          padding: '8px 12px', background: '#F9F6F2', borderBottom: `1px solid ${O.border}`, gap: 6,
        }}>
          {['Customer', 'Visits', 'Stamps', 'Last visit'].map(h => (
            <div key={h} style={{
              fontSize: 7.5, fontWeight: 600, color: O.muted,
              textTransform: 'uppercase', letterSpacing: '0.07em',
            }}>{h}</div>
          ))}
        </div>
        {PEOPLE.map((p, i) => (
          <div key={p.name} style={{
            display: 'grid', gridTemplateColumns: '1.6fr 0.6fr 0.9fr 1fr',
            padding: '10px 12px', gap: 6, alignItems: 'center',
            borderBottom: i < PEOPLE.length - 1 ? `1px solid ${O.border}` : 'none',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0 }}>
              <div style={{
                width: 24, height: 24, borderRadius: '50%', background: O.amberSoft,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, flexShrink: 0,
              }}>{p.avatar}</div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 9.5, fontWeight: 500, color: O.ink }}>{p.name}</div>
                <div style={{ fontSize: 7.5, color: O.muted }}>
                  {p.visits >= 20 ? '⭐ VIP' : p.visits >= 5 ? 'Regular' : 'New'}
                </div>
              </div>
            </div>
            <div style={{ fontSize: 10, color: O.ink, fontWeight: 500 }}>{p.visits}</div>
            <div>
              <div style={{ display: 'flex', gap: 2, marginBottom: 2 }}>
                {Array.from({ length: Math.min(total, 8) }).map((_, si) => (
                  <div key={si} style={{
                    width: 4, height: 4, borderRadius: '50%',
                    background: si < p.stamps ? O.amber : '#E8E3DC',
                  }} />
                ))}
              </div>
              <div style={{ fontSize: 7, color: O.muted }}>{p.stamps}/{total}</div>
            </div>
            <div style={{ fontSize: 8.5, color: O.mid }}>{p.last}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function OfferScreen() {
  return (
    <div style={{ padding: '16px 14px' }}>
      <OwnerHead eyebrow="Reaches 84 phones" title="Send an Offer" sub="Goes to everyone with a card at your spot" />

      <div style={{ background: O.card, border: `1px solid ${O.border}`, borderRadius: 11, padding: '13px 14px' }}>
        <div style={{
          fontSize: 8, fontWeight: 600, color: O.muted, textTransform: 'uppercase',
          letterSpacing: '0.07em', marginBottom: 5,
        }}>Headline</div>
        <div style={{
          background: O.bg, border: `1px solid ${O.border}`, borderRadius: 8,
          padding: '9px 11px', fontSize: 10.5, color: O.ink, marginBottom: 12,
        }}>Rainy Tuesday? Coffee is $1 off</div>

        <div style={{
          fontSize: 8, fontWeight: 600, color: O.muted, textTransform: 'uppercase',
          letterSpacing: '0.07em', marginBottom: 5,
        }}>Details</div>
        <div style={{
          background: O.bg, border: `1px solid ${O.border}`, borderRadius: 8,
          padding: '9px 11px', fontSize: 10, color: O.mid, lineHeight: 1.5,
          height: 46, marginBottom: 12,
        }}>Show this in the app at the register. Today only.</div>

        <div style={{
          fontSize: 8, fontWeight: 600, color: O.muted, textTransform: 'uppercase',
          letterSpacing: '0.07em', marginBottom: 6,
        }}>Runs for</div>
        <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
          {[['24 hours', true], ['3 days', false], ['1 week', false]].map(([l, on]) => (
            <div key={l} style={{
              flex: 1, textAlign: 'center', borderRadius: 8, padding: '7px 4px', fontSize: 9,
              background: on ? O.amberSoft : O.bg,
              border: `1px solid ${on ? 'rgba(245,166,35,0.4)' : O.border}`,
              color: on ? '#B57A12' : O.mid, fontWeight: on ? 600 : 400,
            }}>{l}</div>
          ))}
        </div>

        <div style={{
          background: O.amber, borderRadius: 9, padding: '11px', textAlign: 'center',
          fontSize: 11, fontWeight: 700, color: O.navy,
        }}>Send to 84 customers →</div>
      </div>
    </div>
  )
}

function FeedbackScreen({ name }) {
  const notes = [
    { who: 'Maria R.', avatar: '🧑', mood: '🤩', label: 'Loved it', color: O.sage, when: 'Today', note: 'Best sandwich in town, honestly. The staff always remember my order.' },
    { who: 'Dave K.',  avatar: '🧔', mood: '🙂', label: 'Good',     color: O.amber, when: 'Yesterday', note: 'Great as always, though the line at noon is rough.' },
  ]
  return (
    <div style={{ padding: '16px 14px' }}>
      <OwnerHead eyebrow="2 unread" title="Customer Feedback" sub={`What people say after visiting ${name}`} />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
        {notes.map(f => (
          <div key={f.who} style={{
            background: O.card, border: '1px solid rgba(245,166,35,0.3)', borderRadius: 12,
            padding: '13px 14px', position: 'relative',
          }}>
            <div style={{
              position: 'absolute', top: 12, right: 12, width: 6, height: 6,
              borderRadius: '50%', background: O.amber,
            }} />
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 9, marginBottom: 8 }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%', background: O.amberSoft,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 13, flexShrink: 0,
              }}>{f.avatar}</div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 1 }}>
                  <span style={{ fontSize: 10.5, fontWeight: 600, color: O.ink }}>{f.who}</span>
                  <span style={{ fontSize: 12 }}>{f.mood}</span>
                  <span style={{
                    fontSize: 7.5, fontWeight: 600, color: f.color,
                    background: `${f.color}18`, padding: '2px 6px', borderRadius: 20,
                  }}>{f.label}</span>
                </div>
                <div style={{ fontSize: 8, color: O.muted }}>{f.when}</div>
              </div>
            </div>
            <div style={{
              background: O.bg, borderRadius: 8, padding: '9px 11px',
              fontSize: 9.5, color: O.ink, lineHeight: 1.5,
            }}>&ldquo;{f.note}&rdquo;</div>
          </div>
        ))}
      </div>
    </div>
  )
}
