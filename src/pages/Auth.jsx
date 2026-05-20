import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Icon } from '../components/Icon'
import { useAuth } from '../lib/auth'

function Brand() {
  return (
    <div className="flex items-center gap-3 mb-12">
      <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-red to-[#8B0E18] grid place-items-center shadow-[0_8px_24px_rgba(225,29,42,0.4)]">
        <Icon name="flag" className="w-6 h-6 text-white" strokeWidth={2} />
      </div>
      <div>
        <div className="text-[22px] font-bold tracking-tight">FlagTrack</div>
        <div className="text-[11px] text-text-mute tracking-widest uppercase mt-0.5">Track every flag</div>
      </div>
    </div>
  )
}

function AuthWrap({ children }) {
  return (
    <div className="min-h-screen flex flex-col px-7 pt-14 pb-10 max-w-[440px] mx-auto" style={{ background: 'radial-gradient(800px 500px at 50% -10%, rgba(225,29,42,0.12), transparent 60%), #0B0B0D' }}>
      {children}
    </div>
  )
}

export function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { signIn, signInWithGoogle } = useAuth()
  const nav = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await signIn(email, password)
    setLoading(false)
    if (error) setError(error.message)
    else nav('/')
  }

  return (
    <AuthWrap>
      <Brand />
      <h1 className="text-3xl font-bold tracking-tight mb-2">Welcome back</h1>
      <p className="text-[15px] text-text-dim mb-9">Sign in to log your flags and check your numbers.</p>

      <form onSubmit={handleSubmit}>
        <div className="mb-3.5">
          <label className="block text-xs font-semibold tracking-wider text-text-dim uppercase mb-2">Email</label>
          <input value={email} onChange={e => setEmail(e.target.value)} type="email" required placeholder="you@example.com" className="w-full bg-surface border border-border rounded-xl px-4 py-3.5 text-[15px] focus:border-red focus:bg-surface-2" />
        </div>
        <div className="mb-1">
          <label className="block text-xs font-semibold tracking-wider text-text-dim uppercase mb-2">Password</label>
          <input value={password} onChange={e => setPassword(e.target.value)} type="password" required placeholder="••••••••" className="w-full bg-surface border border-border rounded-xl px-4 py-3.5 text-[15px] focus:border-red focus:bg-surface-2" />
        </div>
        <div className="text-right mb-1.5"><a className="text-[13px] text-text-dim hover:text-red cursor-pointer">Forgot password?</a></div>

        {error && <div className="text-red text-sm mb-3 px-1">{error}</div>}

        <button type="submit" disabled={loading} className="w-full mt-2 py-4 bg-red hover:bg-red-hover rounded-xl text-[15px] font-bold tracking-wide shadow-[0_10px_30px_rgba(225,29,42,0.35)] disabled:opacity-60 active:scale-[0.99] transition-all">
          {loading ? 'Signing in…' : 'Sign In'}
        </button>
      </form>

      <div className="flex items-center gap-3 my-6 text-[12px] text-text-mute tracking-wider">
        <div className="flex-1 h-px bg-border-soft" />OR<div className="flex-1 h-px bg-border-soft" />
      </div>

      <button onClick={signInWithGoogle} className="w-full py-3.5 bg-surface border border-border rounded-xl text-sm font-medium mb-2.5 flex items-center justify-center gap-2.5 hover:bg-surface-2">
        Continue with Google
      </button>

      <div className="mt-auto pt-8 text-center text-sm text-text-dim">
        Don't have an account? <Link to="/signup" className="text-red font-semibold">Sign Up</Link>
      </div>
    </AuthWrap>
  )
}

export function Signup() {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rate, setRate] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { signUp } = useAuth()
  const nav = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await signUp(email, password, fullName, rate)
    setLoading(false)
    if (error) setError(error.message)
    else nav('/')
  }

  return (
    <AuthWrap>
      <Brand />
      <h1 className="text-3xl font-bold tracking-tight mb-2">Create account</h1>
      <p className="text-[15px] text-text-dim mb-9">Start tracking your flag hours in under a minute.</p>

      <form onSubmit={handleSubmit}>
        <div className="mb-3.5">
          <label className="block text-xs font-semibold tracking-wider text-text-dim uppercase mb-2">Full Name</label>
          <input value={fullName} onChange={e => setFullName(e.target.value)} type="text" required placeholder="Alex Rivera" className="w-full bg-surface border border-border rounded-xl px-4 py-3.5 text-[15px] focus:border-red focus:bg-surface-2" />
        </div>
        <div className="mb-3.5">
          <label className="block text-xs font-semibold tracking-wider text-text-dim uppercase mb-2">Email</label>
          <input value={email} onChange={e => setEmail(e.target.value)} type="email" required placeholder="you@example.com" className="w-full bg-surface border border-border rounded-xl px-4 py-3.5 text-[15px] focus:border-red focus:bg-surface-2" />
        </div>
        <div className="mb-3.5">
          <label className="block text-xs font-semibold tracking-wider text-text-dim uppercase mb-2">Password</label>
          <input value={password} onChange={e => setPassword(e.target.value)} type="password" required minLength={6} placeholder="Minimum 6 characters" className="w-full bg-surface border border-border rounded-xl px-4 py-3.5 text-[15px] focus:border-red focus:bg-surface-2" />
        </div>
        <div className="mb-1">
          <label className="block text-xs font-semibold tracking-wider text-text-dim uppercase mb-2">Hourly Flat Rate</label>
          <input value={rate} onChange={e => setRate(e.target.value)} type="number" step="0.01" placeholder="24.00" className="w-full bg-surface border border-border rounded-xl px-4 py-3.5 text-[15px] focus:border-red focus:bg-surface-2" />
        </div>

        {error && <div className="text-red text-sm mt-3 px-1">{error}</div>}

        <button type="submit" disabled={loading} className="w-full mt-4 py-4 bg-red hover:bg-red-hover rounded-xl text-[15px] font-bold tracking-wide shadow-[0_10px_30px_rgba(225,29,42,0.35)] disabled:opacity-60 active:scale-[0.99] transition-all">
          {loading ? 'Creating…' : 'Create Account'}
        </button>
      </form>

      <div className="mt-auto pt-8 text-center text-sm text-text-dim">
        Already have an account? <Link to="/login" className="text-red font-semibold">Sign In</Link>
      </div>
    </AuthWrap>
  )
}
