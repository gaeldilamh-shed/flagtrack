import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Icon } from './Icon'
import { useAuth } from '../lib/auth'

export function AppShell({ children, title, subtitle, showBack, showTopBar = true, userName }) {
  const nav = useNavigate()
  const loc = useLocation()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const { signOut, user } = useAuth()

  const name = userName || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Tech'
  const initials = name.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase()

  const navItems = [
    { path: '/', icon: 'home', label: 'HOME' },
    { path: '/history', icon: 'history', label: 'HISTORY' },
    { path: '/upload', icon: 'camera', label: '', primary: true },
    { path: '/dashboard', icon: 'chart', label: 'STATS' },
    { path: '/settings', icon: 'settings', label: 'MORE' },
  ]

  const drawerLinks = [
    { path: '/', icon: 'home', label: 'Home' },
    { path: '/upload', icon: 'camera', label: 'Upload Ticket' },
    { path: '/history', icon: 'history', label: 'Ticket History' },
    { path: '/dashboard', icon: 'chart', label: 'Dashboard' },
    { path: '/goals', icon: 'target', label: 'Goals' },
    { path: '/paycheck', icon: 'receipt', label: 'Paycheck Audit' },
    { path: '/settings', icon: 'settings', label: 'Settings' },
  ]

  return (
    <div className="relative min-h-screen max-w-[440px] mx-auto pb-[100px]">
      {showTopBar && (
        <>
          {showBack ? (
            <div className="flex items-center gap-3 px-5 py-4">
              <button onClick={() => nav(-1)} className="w-10 h-10 grid place-items-center rounded-xl bg-surface border border-border-soft">
                <Icon name="chevLeft" className="w-4 h-4" />
              </button>
              <div>
                <div className="text-[19px] font-semibold tracking-tight">{title}</div>
                {subtitle && <div className="text-xs text-text-mute mt-0.5">{subtitle}</div>}
              </div>
            </div>
          ) : (
            <div className="sticky top-0 z-40 flex items-center justify-between px-5 py-4 backdrop-blur-xl bg-bg/80">
              <button onClick={() => setDrawerOpen(true)} className="w-10 h-10 grid place-items-center rounded-xl hover:bg-surface-2">
                <Icon name="menu" className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-2.5">
                <span className="text-[15px]">Hi, {name.split(' ')[0]}</span>
                <div className="w-9 h-9 rounded-full border-[1.5px] border-red grid place-items-center text-red">
                  <Icon name="user" className="w-5 h-5" />
                </div>
              </div>
            </div>
          )}
        </>
      )}

      <div className="animate-fade-in">{children}</div>

      {/* Bottom nav */}
      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[440px] bg-bg-2/90 backdrop-blur-xl border-t border-border-soft grid grid-cols-5 pt-2.5 pb-3.5 z-[100]">
        {navItems.map((item, i) => {
          const active = loc.pathname === item.path
          if (item.primary) {
            return (
              <button key={i} onClick={() => nav(item.path)} className="flex flex-col items-center gap-1">
                <div className="w-11 h-11 bg-red rounded-2xl grid place-items-center shadow-[0_8px_18px_rgba(225,29,42,0.4)] -mt-4">
                  <Icon name="camera" className="w-5 h-5 text-white" />
                </div>
              </button>
            )
          }
          return (
            <button key={i} onClick={() => nav(item.path)} className={`flex flex-col items-center gap-1 py-2 text-[10px] font-medium tracking-wide transition-colors ${active ? 'text-red' : 'text-text-mute hover:text-text-main'}`}>
              <Icon name={item.icon} className="w-5 h-5" strokeWidth={1.8} />
              {item.label}
            </button>
          )
        })}
      </nav>

      {/* Drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 bg-black/60 z-[200]" onClick={() => setDrawerOpen(false)} />
      )}
      <aside className={`fixed top-0 left-0 w-[280px] h-screen bg-bg-2 border-r border-border-soft z-[201] transform transition-transform duration-300 ${drawerOpen ? 'translate-x-0' : '-translate-x-full'} overflow-y-auto pt-7 pb-5`}>
        <div className="px-6 pb-5 flex items-center gap-3 border-b border-border-soft mb-4">
          <div className="w-11 h-11 rounded-full bg-gradient-to-br from-red to-[#8B0E18] grid place-items-center text-white font-bold">{initials}</div>
          <div>
            <div className="text-sm font-semibold">{name}</div>
            <div className="text-xs text-text-mute mt-0.5">Firestone Tech</div>
          </div>
        </div>
        {drawerLinks.map((link) => {
          const active = loc.pathname === link.path
          return (
            <button key={link.path} onClick={() => { setDrawerOpen(false); nav(link.path) }} className={`w-full flex items-center gap-3.5 px-6 py-3 text-sm font-medium transition-colors text-left ${active ? 'text-red bg-red/10' : 'text-text-dim hover:text-text-main hover:bg-surface'}`}>
              <Icon name={link.icon} className="w-[18px] h-[18px]" strokeWidth={1.8} />
              {link.label}
            </button>
          )
        })}
        <button onClick={async () => { await signOut(); nav('/login') }} className="w-full flex items-center gap-3.5 px-6 py-3 text-sm font-medium text-red mt-4 border-t border-border-soft pt-4">
          Sign Out
        </button>
        <div className="px-6 pt-5 mt-auto">
          <div className="text-[10px] text-text-mute tracking-wider uppercase">FlagTrack v0.1</div>
          <div className="text-xs text-text-dim mt-1">Track every flag. Know every dollar.</div>
        </div>
      </aside>
    </div>
  )
}
