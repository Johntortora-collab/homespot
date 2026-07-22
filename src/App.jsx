import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom'
import { AuthProvider, useAuth } from './lib/AuthContext'
import { useMySpot } from './lib/hooks'

// Consumer pages
import ConsumerApp     from './pages/consumer/ConsumerApp'

// Owner pages
import OwnerOnboarding from './pages/owner/OwnerOnboarding'
import OwnerDashboard  from './pages/owner/OwnerDashboard'

// Legal pages
import Terms   from './pages/Terms'
import Privacy from './pages/Privacy'

// Password recovery
import ResetPassword from './pages/ResetPassword'

// Admin
import AdminTowns from './pages/AdminTowns'

function Router() {
  const { session, profile, loading } = useAuth()

  if (loading) return <Loader />

  // Always reachable regardless of auth state.
  //
  // /reset-password MUST live here rather than inside one of the role branches
  // below. A Supabase recovery link creates a real session before this component
  // renders, so if the route sat under the role checks the user would be routed
  // straight to their dashboard and never get to set a new password.
  const legalRoutes = (
    <>
      <Route path="/terms"          element={<Terms />} />
      <Route path="/privacy"        element={<Privacy />} />
      <Route path="/reset-password" element={<ResetPassword />} />
    </>
  )

  // Not signed in → consumer signup or owner onboarding
  if (!session) return (
    <Routes>
      {legalRoutes}
      <Route path="/"             element={<ConsumerApp />} />
      <Route path="/scan/:spotId" element={<ConsumerApp />} />
      <Route path="/owner"        element={<OwnerOnboarding />} />
      <Route path="*"             element={<Navigate to="/" />} />
    </Routes>
  )

  // Signed in as owner
  if (profile?.role === 'owner') return (
    <Routes>
      {legalRoutes}
      <Route path="/admin"           element={<AdminTowns />} />
      <Route path="/scan/:spotId"    element={<ScanRoute />} />
      <Route path="/owner"           element={<Navigate to="/owner/dashboard" replace />} />
      <Route path="/owner/onboard"   element={<OwnerOnboarding />} />
      <Route path="/owner/dashboard" element={<OwnerDashboard />} />
      {/* Owners are customers too. Anything that isn't an /owner route falls
          through to the consumer app so they can browse Main Street, keep their
          own stamp cards, and claim perks at other businesses. ConsumerApp shows
          them a "My business" pill to get back here. Previously this line was
          Navigate to /owner/dashboard, which meant an owner could earn a stamp
          via a /scan/ link but was bounced out the moment they navigated. */}
      <Route path="*"                element={<ConsumerApp />} />
    </Routes>
  )

  // Signed in as consumer (default)
  return (
    <Routes>
      {legalRoutes}
      <Route path="/admin"        element={<AdminTowns />} />
      <Route path="/scan/:spotId" element={<ScanRoute />} />
      {/* A signed-in consumer must still be able to reach business onboarding.
          Without this, "/owner" fell through to the "/*" catch-all below and
          dumped them back into the consumer app. */}
      <Route path="/owner"          element={<OwnerOnboarding />} />
      <Route path="/owner/onboard"  element={<OwnerOnboarding />} />
      <Route path="/*"            element={<ConsumerApp />} />
    </Routes>
  )
}

// Someone signed in tapped a tag. Whose spot is it?
//
//   Their own + role is owner  -> dashboard (the shortcut they want)
//   Their own + role is NOT owner -> a notice, NOT a stamp
//   Someone else's             -> treat them as a customer and let them earn a stamp
//
// Two things this deliberately does NOT do:
//
// 1. It does not gate on profile.role before checking ownership. The old version
//    only ran for role === 'owner', so a business owner whose account hadn't been
//    flipped to owner yet (easy to miss when provisioning accounts by hand in the
//    Supabase dashboard) fell straight through to ConsumerApp and could collect
//    stamps on their own loyalty card.
//
// 2. It does not compare ids with plain ===. UUID casing has burned us before;
//    normalising both sides means a link that arrives uppercased still matches
//    instead of silently failing open into the consumer flow.
//
// Without this route entirely, the catch-all "*" swallowed every /scan/ URL and
// sent owners to their dashboard no matter whose counter they were standing at —
// meaning a shop owner could never collect stamps anywhere in their own town.
function ScanRoute() {
  const { spotId } = useParams()
  const { profile } = useAuth()
  const { spot, loading } = useMySpot()

  if (loading) return <Loader />

  const norm = v => (v == null ? '' : String(v).trim().toLowerCase())
  const isOwnSpot = !!spot && norm(spot.id) === norm(spotId)

  if (isOwnSpot) {
    if (profile?.role === 'owner') return <Navigate to="/owner/dashboard" replace />
    return <OwnSpotNotice spotName={spot.name} />
  }

  return <ConsumerApp />
}

// Shown when the signed-in user owns the scanned spot but their account still
// says "consumer". Better to stop here than to let them stamp their own card.
function OwnSpotNotice({ spotName }) {
  return (
    <div style={{ minHeight:'100vh', background:'#13131F', display:'flex', alignItems:'center', justifyContent:'center', padding:'24px', fontFamily:'Inter,sans-serif' }}>
      <div style={{ textAlign:'center', maxWidth:320 }}>
        <div style={{ fontSize:44, marginBottom:16 }}>🏪</div>
        <div style={{ fontFamily:'Fraunces,serif', fontSize:20, color:'#fff', fontWeight:700, marginBottom:10 }}>
          That's your own spot
        </div>
        <p style={{ fontSize:13.5, color:'#888', lineHeight:1.6, marginBottom:20 }}>
          {spotName ? `${spotName} is registered to this account, so you can't collect a stamp here.` : "This business is registered to your account, so you can't collect a stamp here."}
          {' '}Your account isn't set up as a business owner yet — once it is, scanning this code will open your dashboard.
        </p>
        <button onClick={()=>{ window.location.href = '/' }}
          style={{ background:'#F5A623', border:'none', borderRadius:13, padding:'12px 26px', fontSize:14, fontWeight:600, color:'#13131F', cursor:'pointer' }}>
          Back to Homespot
        </button>
      </div>
    </div>
  )
}

function Loader() {
  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#13131F' }}>
      <div style={{ textAlign:'center' }}>
        <svg width={48} height={48} viewBox="0 0 32 32" fill="none" style={{ marginBottom:12, animation:'spin 1s linear infinite' }}>
          <circle cx="16" cy="16" r="14" stroke="#F5A623" strokeWidth="3" strokeDasharray="44 44" strokeLinecap="round"/>
        </svg>
        <div style={{ fontFamily:'Fraunces,serif', fontSize:18, color:'#fff', letterSpacing:'-0.02em' }}>
          home<span style={{ color:'#F5A623' }}>spot</span>
        </div>
        <style>{`@keyframes spin { to { transform:rotate(360deg) } }`}</style>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Router />
      </BrowserRouter>
    </AuthProvider>
  )
}
