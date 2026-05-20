import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './lib/auth'
import { Login, Signup } from './pages/Auth'
import { Home } from './pages/Home'
import { Upload } from './pages/Upload'
import { Editor } from './pages/Editor'
import { History, Dashboard, Goals, Paycheck, Settings } from './pages/Other'

function Protected({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="min-h-screen grid place-items-center text-text-dim">Loading…</div>
  if (!user) return <Navigate to="/login" replace />
  return children
}

function PublicOnly({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="min-h-screen grid place-items-center text-text-dim">Loading…</div>
  if (user) return <Navigate to="/" replace />
  return children
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<PublicOnly><Login /></PublicOnly>} />
        <Route path="/signup" element={<PublicOnly><Signup /></PublicOnly>} />
        <Route path="/" element={<Protected><Home /></Protected>} />
        <Route path="/upload" element={<Protected><Upload /></Protected>} />
        <Route path="/editor/:id" element={<Protected><Editor /></Protected>} />
        <Route path="/history" element={<Protected><History /></Protected>} />
        <Route path="/dashboard" element={<Protected><Dashboard /></Protected>} />
        <Route path="/goals" element={<Protected><Goals /></Protected>} />
        <Route path="/paycheck" element={<Protected><Paycheck /></Protected>} />
        <Route path="/settings" element={<Protected><Settings /></Protected>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  )
}
