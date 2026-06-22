import { Link } from 'react-router-dom'

const C = { bg:'#FDF8F2', ink:'#1A1A2E', amber:'#F5A623', muted:'#6B7280', border:'#E8E3DC' }

export default function Privacy() {
  return (
    <div style={{ minHeight:'100vh', background:C.bg, fontFamily:'Inter,sans-serif', color:C.ink }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,600;0,9..144,700&family=Inter:wght@400;500;600&display=swap');*{box-sizing:border-box}`}</style>
      <div style={{ maxWidth:680, margin:'0 auto', padding:'48px 24px 80px' }}>
        <Link to="/" style={{ fontSize:13, color:C.amber, textDecoration:'none', fontWeight:600 }}>← Back to Homespot</Link>

        <h1 style={{ fontFamily:'Fraunces,serif', fontSize:34, fontWeight:700, marginTop:24, marginBottom:8 }}>Privacy Policy</h1>
        <p style={{ fontSize:13, color:C.muted, marginBottom:36 }}>Last updated: June 2026</p>

        <Section title="What we collect">
          <ul style={listStyle}>
            <li><strong>Account info:</strong> name, email, and avatar you choose</li>
            <li><strong>Location:</strong> the town you select to browse local spots — we don't track precise GPS location unless you explicitly use "Use my location"</li>
            <li><strong>Visit activity:</strong> when you scan a Spot QR, we record the visit, timestamp, and which business — this is how stamps and Local Perks work</li>
            <li><strong>Feedback:</strong> mood ratings and notes you leave for a business</li>
            <li><strong>Business data:</strong> if you create a business listing, the details you provide about that business</li>
          </ul>
        </Section>

        <Section title="How we use it">
          We use your data to operate Homespot's core features: showing you nearby spots, tracking
          your Spot Cards, letting businesses see their own customer activity, and delivering offers
          you've opted into by following a business. We do not sell your personal data to third parties.
        </Section>

        <Section title="What businesses can see">
          A business you visit can see your name, avatar, visit count, stamp progress, and any
          feedback you leave for them. They cannot see your activity at other businesses, your email,
          or any other personal account details.
        </Section>

        <Section title="Advertising">
          Homespot does not display third-party ads, and we don't share your data with advertisers.
          Offers you see come directly from businesses you've chosen to follow on Homespot.
        </Section>

        <Section title="Data storage">
          Your data is stored securely using industry-standard encryption, via our infrastructure
          provider Supabase. Row-level security ensures businesses can only access data tied to
          their own spot — never another business's customer list.
        </Section>

        <Section title="Your choices">
          You can update your profile, switch towns, or delete your account at any time from your
          profile settings. Deleting your account removes your personal data; visit counts contributing
          to a business's aggregate stats may be retained in anonymized form.
        </Section>

        <Section title="Children's privacy">
          Homespot is not directed at children under 13, and we don't knowingly collect data from
          them. If you believe a child has created an account, contact us and we'll remove it.
        </Section>

        <Section title="Changes to this policy">
          We'll update this page if our practices change, and post a new date at the top.
        </Section>

        <Section title="Contact">
          Questions about your data? Reach out at <strong>privacy@gethomespot.app</strong>.
        </Section>
      </div>
    </div>
  )
}

const listStyle = { fontSize:14, color:'#4B5563', lineHeight:1.8, paddingLeft:20, margin:0 }

function Section({ title, children }) {
  return (
    <div style={{ marginBottom:28 }}>
      <h2 style={{ fontFamily:'Fraunces,serif', fontSize:18, fontWeight:700, marginBottom:8 }}>{title}</h2>
      <div style={{ fontSize:14, color:'#4B5563', lineHeight:1.7 }}>{children}</div>
    </div>
  )
}
