import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppShell } from '../components/AppShell'
import { Icon } from '../components/Icon'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { fmtMoney, useRateLock } from '../lib/privacy'
import { UnlockModal } from '../components/UnlockModal'

// ============ HISTORY ============
export function History() {
  const nav = useNavigate()
  const { user } = useAuth()
  const [tickets, setTickets] = useState([])
  const [profile, setProfile] = useState(null)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')

  useEffect(() => { if (user) load() }, [user])
  async function load() {
    const { data: t } = await supabase.from('tickets').select('*, ticket_lines(description)').eq('user_id', user.id).order('ticket_date', { ascending: false }).limit(100)
    const { data: p } = await supabase.from('profiles').select('hourly_rate').eq('id', user.id).single()
    setTickets(t || [])
    setProfile(p)
  }

  const rate = parseFloat(profile?.hourly_rate || 0)
  const filtered = tickets.filter(t => {
    if (filter !== 'all' && t.status !== filter) return false
    if (search) {
      const s = search.toLowerCase()
      const hay = `${t.work_order} ${t.vehicle_year} ${t.vehicle_make} ${t.vehicle_model} ${(t.ticket_lines || []).map(l => l.description).join(' ')}`.toLowerCase()
      if (!hay.includes(s)) return false
    }
    return true
  })

  return (
    <AppShell title="Ticket History" subtitle="All your flagged work" showBack>
      <div className="mx-5 mb-4 relative">
        <Icon name="search" className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-mute" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search ticket #, vehicle, service…" className="w-full bg-surface border border-border-soft rounded-xl pl-11 pr-4 py-3 text-sm focus:border-red" />
      </div>
      <div className="flex gap-2 px-5 pb-4 overflow-x-auto no-scrollbar">
        {['all', 'confirmed', 'draft', 'estimated'].map(f => (
          <button key={f} onClick={() => setFilter(f)} className={`flex-shrink-0 px-3.5 py-2 rounded-full text-xs font-medium border ${filter === f ? 'bg-red/10 border-red text-red' : 'bg-surface border-border-soft text-text-dim'}`}>
            {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      <div className="px-5 grid gap-2.5">
        {filtered.length === 0 && (
          <div className="bg-surface border border-border-soft rounded-2xl p-8 text-center">
            <Icon name="receipt" className="w-10 h-10 text-text-mute mx-auto mb-3" />
            <div className="font-medium mb-1">No tickets yet</div>
            <p className="text-sm text-text-dim">Upload your first ticket to get started.</p>
          </div>
        )}
        {filtered.map(t => {
          const d = new Date(t.ticket_date)
          const services = (t.ticket_lines || []).map(l => l.description).slice(0, 3).join(' · ')
          const hrs = parseFloat(t.total_flag_hours || 0)
          return (
            <button key={t.id} onClick={() => nav('/editor/' + t.id)} className="flex items-center gap-3.5 bg-surface border border-border-soft rounded-2xl py-3.5 px-4 hover:bg-surface-2 text-left">
              <div className="w-12 text-center border-r border-border-soft pr-3.5">
                <div className="text-xl font-bold leading-none">{d.getDate()}</div>
                <div className="text-[10px] text-text-mute tracking-widest uppercase mt-1">{d.toLocaleString('en-US', { month: 'short' })}</div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[11px] text-text-mute tracking-wider uppercase">WO #{t.work_order || '—'}</div>
                <div className="text-sm font-semibold mt-0.5 truncate">{t.vehicle_year} {t.vehicle_make} {t.vehicle_model}</div>
                <div className="text-xs text-text-dim mt-0.5 truncate">{services || 'No items'}</div>
              </div>
              <div className="text-right">
                <div className="text-[17px] font-bold text-red font-mono">{hrs.toFixed(1)}</div>
                <div className="text-[11px] text-text-dim mt-0.5">{fmtMoney(hrs * rate)}</div>
              </div>
            </button>
          )
        })}
      </div>
    </AppShell>
  )
}

// ============ DASHBOARD ============
export function Dashboard() {
  const { user } = useAuth()
  const [tickets, setTickets] = useState([])
  const [profile, setProfile] = useState(null)
  const { unlocked } = useRateLock()
  const [showUnlock, setShowUnlock] = useState(false)

  useEffect(() => { if (user) load() }, [user])
  async function load() {
    const since = new Date(); since.setDate(since.getDate() - 90)
    const { data: t } = await supabase.from('tickets').select('*').eq('user_id', user.id).gte('ticket_date', since.toISOString())
    const { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    setTickets(t || [])
    setProfile(p)
  }

  const rate = parseFloat(profile?.hourly_rate || 0)

  // This week (Mon-Sun)
  const now = new Date()
  const day = now.getDay()
  const diff = day === 0 ? -6 : 1 - day
  const monday = new Date(now); monday.setDate(now.getDate() + diff); monday.setHours(0,0,0,0)
  const lastWeekMon = new Date(monday); lastWeekMon.setDate(monday.getDate() - 7)

  const weekTickets = tickets.filter(t => new Date(t.ticket_date) >= monday)
  const lastWeekTickets = tickets.filter(t => { const d = new Date(t.ticket_date); return d >= lastWeekMon && d < monday })

  const weekHours = weekTickets.reduce((s, t) => s + parseFloat(t.total_flag_hours || 0), 0)
  const lastWeekHours = lastWeekTickets.reduce((s, t) => s + parseFloat(t.total_flag_hours || 0), 0)
  const pctDelta = lastWeekHours > 0 ? Math.round(((weekHours - lastWeekHours) / lastWeekHours) * 100) : 0

  // Bars: hours per day Mon-Sun
  const byDay = [0, 0, 0, 0, 0, 0, 0]
  weekTickets.forEach(t => {
    const d = new Date(t.ticket_date)
    const idx = d.getDay() === 0 ? 6 : d.getDay() - 1
    byDay[idx] += parseFloat(t.total_flag_hours || 0)
  })
  const maxDay = Math.max(...byDay, 1)
  const bestDayIdx = byDay.indexOf(Math.max(...byDay))
  const bestDay = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'][bestDayIdx]
  const avg = weekHours / 7

  return (
    <AppShell title="Dashboard" subtitle="Your numbers at a glance" showBack>
      <div className="grid grid-cols-2 gap-3 px-5 mb-4">
        <MiniStat label="This Week" value={weekHours.toFixed(1)} suffix="hrs" red delta={pctDelta} />
        <MiniStat label="Est. Gross" value={fmtMoney(weekHours * rate).replace(/\.\d+/, '')} suffix=".00" privateValue blurred={!unlocked} />
        <MiniStat label="Best Day" value={Math.max(...byDay).toFixed(1)} suffix=" hrs" subtitle={bestDay} />
        <MiniStat label="Avg / Day" value={avg.toFixed(1)} suffix=" hrs" />
      </div>

      <div className="mx-5 mb-4 p-5 bg-surface border border-border-soft rounded-3xl">
        <div className="flex justify-between items-center mb-4">
          <div className="text-sm font-semibold">Flag Hours Trend</div>
          <div className="flex gap-1 bg-surface-2 rounded-lg p-0.5">
            {['D', 'W', 'M', 'Y'].map((t, i) => (
              <button key={t} className={`text-[11px] px-2.5 py-1 rounded font-semibold tracking-wide ${i === 1 ? 'bg-red text-white' : 'text-text-mute'}`}>{t}</button>
            ))}
          </div>
        </div>
        <div className="flex gap-2 items-end h-32 px-1">
          {['MON','TUE','WED','THU','FRI','SAT','SUN'].map((d, i) => (
            <div key={d} className="flex-1 flex flex-col items-center gap-2">
              <div className="w-full bg-gradient-to-b from-red to-[#8B0E18] rounded-t-md min-h-[4px] shadow-[0_-4px_12px_rgba(225,29,42,0.2)]" style={{ height: `${Math.max(4, (byDay[i] / maxDay) * 100)}%` }}></div>
              <div className="text-[10px] text-text-mute font-medium tracking-wider">{d}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="px-5 pt-2 pb-2.5 flex justify-between items-center">
        <span className="text-xs font-semibold tracking-widest text-text-dim uppercase">Pay Projection</span>
        <button onClick={() => setShowUnlock(true)} className="w-7 h-7 bg-surface border border-border-soft rounded-lg grid place-items-center text-text-mute hover:text-text-main">
          <Icon name={unlocked ? 'eye' : 'eyeOff'} className="w-3.5 h-3.5" />
        </button>
      </div>
      <div className="mx-5 bg-surface border border-border-soft rounded-3xl overflow-hidden">
        <ProjRow label="Daily Avg" value={fmtMoney(avg * rate)} blurred={!unlocked} />
        <ProjRow label="This Week (proj)" value={fmtMoney((weekHours + avg * Math.max(0, 5 - day)) * rate)} blurred={!unlocked} />
        <ProjRow label="Biweekly" value={fmtMoney(weekHours * 2 * rate)} blurred={!unlocked} />
        <ProjRow label="Monthly" value={fmtMoney(avg * 30 * rate)} blurred={!unlocked} />
        <ProjRow label="Yearly" value={fmtMoney(avg * 52 * 7 * rate)} blurred={!unlocked} />
      </div>

      <UnlockModal open={showUnlock} onClose={() => setShowUnlock(false)} />
    </AppShell>
  )
}

function MiniStat({ label, value, suffix, red, delta, subtitle, privateValue, blurred }) {
  return (
    <div className="bg-surface border border-border-soft rounded-3xl p-4">
      <div className="text-[11px] tracking-widest uppercase text-text-dim font-semibold mb-2">{label}</div>
      <div className={`text-[22px] font-bold tracking-tight ${red ? 'text-red' : ''} ${privateValue && blurred ? 'private-blur' : ''}`}>
        {value}{suffix && <span className="text-sm text-text-dim ml-0.5">{suffix}</span>}
      </div>
      {delta !== undefined && (
        <div className={`text-xs mt-1 inline-flex items-center gap-1 ${delta >= 0 ? 'text-green' : 'text-red'}`}>
          {delta >= 0 ? '▲' : '▼'} {Math.abs(delta)}% vs last
        </div>
      )}
      {subtitle && <div className="text-xs text-text-dim mt-1">{subtitle}</div>}
    </div>
  )
}
function ProjRow({ label, value, blurred }) {
  return (
    <div className="flex justify-between items-center px-5 py-4 border-b border-border-soft last:border-b-0">
      <span className="text-sm font-medium">{label}</span>
      <span className={`text-sm font-mono font-semibold ${blurred ? 'private-blur' : ''}`}>{value}</span>
    </div>
  )
}

// ============ GOALS ============
export function Goals() {
  const { user } = useAuth()
  const [goals, setGoals] = useState([])
  useEffect(() => { if (user) load() }, [user])
  async function load() {
    const { data } = await supabase.from('goals').select('*').eq('user_id', user.id).eq('is_active', true).order('created_at')
    setGoals(data || [])
  }

  return (
    <AppShell title="Goals" subtitle="Track what matters" showBack>
      <div className="px-5 grid gap-3">
        {goals.length === 0 && (
          <div className="bg-surface border border-border-soft rounded-2xl p-8 text-center">
            <Icon name="target" className="w-10 h-10 text-text-mute mx-auto mb-3" />
            <div className="font-medium mb-1">No goals yet</div>
            <p className="text-sm text-text-dim mb-4">Set a weekly income or hours target to track progress.</p>
          </div>
        )}
        {goals.map(g => (
          <div key={g.id} className="bg-surface border border-border-soft rounded-3xl p-5">
            <div className="flex justify-between items-center mb-3.5">
              <div>
                <div className="text-base font-semibold">{g.goal_type === 'income' ? 'Income' : 'Flag Hours'} · {g.period}</div>
                <div className="text-[11px] text-text-mute tracking-wider uppercase mt-1">{g.period}</div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-red font-mono">--</div>
                <div className="text-sm text-text-dim mt-1"><strong>0</strong> / {g.target_amount}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </AppShell>
  )
}

// ============ PAYCHECK ============
export function Paycheck() {
  return (
    <AppShell title="Paycheck Audit" subtitle="Spot the discrepancies" showBack>
      <div className="mx-5 bg-surface border border-border-soft rounded-2xl p-8 text-center">
        <Icon name="receipt" className="w-10 h-10 text-text-mute mx-auto mb-3" />
        <div className="font-medium mb-1">No paychecks logged yet</div>
        <p className="text-sm text-text-dim mb-4">Enter your paycheck after each pay period to compare against expected gross.</p>
      </div>
    </AppShell>
  )
}

// ============ SETTINGS ============
export function Settings() {
  const { user, signOut } = useAuth()
  const nav = useNavigate()
  const [profile, setProfile] = useState(null)
  const { unlocked, lock } = useRateLock()
  const [showUnlock, setShowUnlock] = useState(false)

  useEffect(() => { if (user) load() }, [user])
  async function load() {
    const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    setProfile(data)
  }

  return (
    <AppShell title="Settings" subtitle="Tune the app to your shop" showBack>
      <SettingsGroup title="Profile">
        <SettingsRow label="Full Name" sub={profile?.full_name || '—'} />
        <SettingsRow label="Email" sub={user?.email || '—'} />
        <SettingsRow label="Shop" sub={profile?.shop_name || 'Add your shop'} />
      </SettingsGroup>

      <SettingsGroup title="Pay">
        <div className="flex justify-between items-center px-5 py-4 border-b border-border-soft">
          <div>
            <div className="text-sm font-medium">Hourly Flat Rate</div>
            <div className="text-xs text-text-mute mt-0.5">Per flagged hour · Private</div>
          </div>
          {unlocked && profile ? (
            <div className="flex items-center gap-2">
              <span className="text-red font-bold font-mono">{fmtMoney(profile.hourly_rate || 0)}</span>
              <button onClick={lock} className="bg-surface-3 hover:bg-red/10 hover:text-red text-text-dim font-semibold text-[11px] px-2.5 py-1 rounded-full inline-flex items-center gap-1.5">
                <Icon name="unlock" className="w-3 h-3" /> Lock
              </button>
            </div>
          ) : (
            <button onClick={() => setShowUnlock(true)} className="flex items-center gap-2">
              <span className="text-text-dim font-mono tracking-wider">$••.••</span>
              <span className="bg-surface-3 hover:bg-red/10 hover:text-red text-text-dim font-semibold text-[11px] px-2.5 py-1 rounded-full inline-flex items-center gap-1.5">
                <Icon name="lock" className="w-3 h-3" /> Unlock
              </span>
            </button>
          )}
        </div>
        <SettingsRow label="Currency" value="USD ($)" chevron />
        <SettingsRow label="Pay Frequency" value="Biweekly" chevron />
      </SettingsGroup>

      <SettingsGroup title="Privacy">
        <ToggleRow label="Always require unlock for rate" sub="Face ID / Touch ID / PIN" defaultOn />
        <ToggleRow label="Hide money on home screen" sub="Goal progress amounts" />
        <ToggleRow label="Auto-hide after 10s" sub="When rate is revealed" defaultOn />
      </SettingsGroup>

      <SettingsGroup title="Flag Library">
        <SettingsRow label="Services in library" sub="50 saved · 0 customized" chevron />
      </SettingsGroup>

      <SettingsGroup title="Preferences">
        <ToggleRow label="Dark Mode" sub="Default" defaultOn />
        <ToggleRow label="Notifications" sub="Reminders & goal alerts" defaultOn />
      </SettingsGroup>

      <SettingsGroup>
        <button onClick={async () => { await signOut(); nav('/login') }} className="w-full text-left px-5 py-4 text-red font-medium text-sm">Sign Out</button>
      </SettingsGroup>

      <UnlockModal open={showUnlock} onClose={() => setShowUnlock(false)} />
    </AppShell>
  )
}

function SettingsGroup({ title, children }) {
  return (
    <div className="mx-5 mb-4 bg-surface border border-border-soft rounded-3xl overflow-hidden">
      {title && <div className="px-5 pt-4 pb-1.5 text-[11px] tracking-widest text-text-mute font-semibold uppercase">{title}</div>}
      {children}
    </div>
  )
}
function SettingsRow({ label, sub, value, chevron }) {
  return (
    <div className="flex justify-between items-center px-5 py-4 border-b border-border-soft last:border-b-0">
      <div>
        <div className="text-sm font-medium">{label}</div>
        {sub && <div className="text-xs text-text-mute mt-0.5">{sub}</div>}
      </div>
      <div className="text-sm text-text-dim flex items-center gap-1.5">
        {value}
        {chevron && <Icon name="chevRight" className="w-3.5 h-3.5 text-text-mute" />}
      </div>
    </div>
  )
}
function ToggleRow({ label, sub, defaultOn = false }) {
  const [on, setOn] = useState(defaultOn)
  return (
    <div className="flex justify-between items-center px-5 py-4 border-b border-border-soft last:border-b-0">
      <div>
        <div className="text-sm font-medium">{label}</div>
        {sub && <div className="text-xs text-text-mute mt-0.5">{sub}</div>}
      </div>
      <button onClick={() => setOn(!on)} className={`w-10 h-[22px] rounded-full relative transition-colors ${on ? 'bg-red' : 'bg-surface-3'}`}>
        <div className={`absolute top-0.5 left-0.5 w-[18px] h-[18px] bg-white rounded-full transition-transform ${on ? 'translate-x-[18px]' : ''}`}></div>
      </button>
    </div>
  )
}
