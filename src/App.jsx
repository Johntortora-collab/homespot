import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './lib/AuthContext'

// Consumer pages
import ConsumerApp     from './pages/consumer/ConsumerApp'

// Owner pages
import OwnerOnboarding from './pages/owner/OwnerOnboarding'
import OwnerDashboard  from './pages/owner/OwnerDashboard'

// Legal pages
import Terms   from './pages/Terms'
import Privacy from './pages/Privacy'

// Admin
import AdminTowns from './pages/AdminTowns'

function Router() {
  const { session, profile, loading } = useAuth()

  if (loading) return <Loader />

  // Legal pages are always reachable regardless of auth state
  const legalRoutes = (
    <>
      <Route path="/terms"   element={<Terms />} />
      <Route path="/privacy" element={<Privacy />} />
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
      <Route path="/owner/onboard"   element={<OwnerOnboarding />} />
      <Route path="/owner/dashboard" element={<OwnerDashboard />} />
      <Route path="*"                element={<Navigate to="/owner/dashboard" />} />
    </Routes>
  )

  // Signed in as consumer (default)
  return (
    <Routes>
      {legalRoutes}
      <Route path="/admin"        element={<AdminTowns />} />
      <Route path="/scan/:spotId" element={<ConsumerApp />} />
      <Route path="/*"            element={<ConsumerApp />} />
    </Routes>
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
