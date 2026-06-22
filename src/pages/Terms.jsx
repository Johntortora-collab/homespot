import { Link } from 'react-router-dom'

const C = { bg:'#FDF8F2', ink:'#1A1A2E', amber:'#F5A623', muted:'#6B7280', border:'#E8E3DC' }

export default function Terms() {
  return (
    <div style={{ minHeight:'100vh', background:C.bg, fontFamily:'Inter,sans-serif', color:C.ink }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,600;0,9..144,700&family=Inter:wght@400;500;600&display=swap');*{box-sizing:border-box}`}</style>
      <div style={{ maxWidth:680, margin:'0 auto', padding:'48px 24px 80px' }}>
        <Link to="/" style={{ fontSize:13, color:C.amber, textDecoration:'none', fontWeight:600 }}>← Back to Homespot</Link>

        <h1 style={{ fontFamily:'Fraunces,serif', fontSize:34, fontWeight:700, marginTop:24, marginBottom:8 }}>Terms of Service</h1>
        <p style={{ fontSize:13, color:C.muted, marginBottom:36 }}>Last updated: June 2026</p>

        <Section title="1. What Homespot is">
          Homespot is a community app connecting local businesses with nearby customers through
          loyalty tracking, offers, and feedback. By creating an account, you agree to these terms.
        </Section>

        <Section title="2. Accounts">
          You need an account to use Homespot's features. You're responsible for keeping your login
          credentials secure and for any activity that happens under your account. You must be at
          least 13 years old to create a consumer account, and at least 18 to register a business.
        </Section>

        <Section title="3. Spot Cards and Local Perks">
          Stamps, Spot Cards, and Local Perks are loyalty mechanics offered by individual businesses
          through Homespot. Homespot facilitates this tracking but is not responsible for a business's
          ability or willingness to honor a perk. Each business sets its own stamp requirements and
          rewards, and may change or discontinue them at any time with reasonable notice to customers.
        </Section>

        <Section title="4. Acceptable use">
          Don't attempt to manipulate stamp counts, scan QR codes you don't have legitimate access to,
          impersonate a business you don't own, or use Homespot to harass other users or businesses.
          We may suspend or terminate accounts that violate this.
        </Section>

        <Section title="5. Business accounts">
          If you create a business listing, you confirm you're authorized to represent that business.
          You're responsible for the accuracy of your listing, the offers you send, and honoring the
          Local Perks your Spot Card promises to customers who complete it.
        </Section>

        <Section title="6. Content you submit">
          Feedback, ratings, and notes you submit may be visible to the business you're reviewing.
          Don't submit anything false, abusive, or that violates someone else's rights.
        </Section>

        <Section title="7. No warranty">
          Homespot is provided "as is." We don't guarantee uninterrupted access, that every business
          listing is accurate, or that any specific perk will be available when you try to redeem it.
        </Section>

        <Section title="8. Changes to these terms">
          We may update these terms as Homespot grows. We'll post the updated version here with a new
          date. Continuing to use Homespot after changes means you accept the updated terms.
        </Section>

        <Section title="9. Contact">
          Questions about these terms? Reach out at <strong>support@gethomespot.app</strong>.
        </Section>
      </div>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom:28 }}>
      <h2 style={{ fontFamily:'Fraunces,serif', fontSize:18, fontWeight:700, marginBottom:8 }}>{title}</h2>
      <p style={{ fontSize:14, color:'#4B5563', lineHeight:1.7 }}>{children}</p>
    </div>
  )
}
