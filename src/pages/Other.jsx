import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppShell } from '../components/AppShell'
import { Icon } from '../components/Icon'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { fmtMoney, useRateLock } from '../lib/privacy'
import { UnlockModal } from '../components/UnlockModal'
import { getCurrentPeriod, paceStatus, periodRangeLabel } from '../lib/payPeriod'
import { useLiveData } from '../hooks/useLiveData'

// ============ HISTORY ============
export function History() {
  const nav = useNavigate()
  const { user } = useAuth()
  const [tickets, setTickets] = useState([])
  const [profile, setProfile] = useState(null)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [confirmDelete, setConfirmDelete] = useState(null) // ticket pending deletion
  const [deleting, setDeleting] = useState(false)

  useLiveData(() => { if (user) load() }, [user])
  async function load() {
    const { data: t } = await supabase.from('tickets').select('*, ticket_lines(description)').eq('user_id', user.id).order('ticket_date', { ascending: false }).limit(100)
    const { data: p } = await supabase.from('profiles').select('hourly_rate').eq('id', user.id).single()
    setTickets(t || [])
    setProfile(p)
  }

  async function deleteTicket(ticket) {
    setDeleting(true)
    try {
      // ticket_lines cascade-delete automatically when the ticket is removed
      const { error } = await supabase.from('tickets').delete().eq('id', ticket.id)
      if (error) throw error
      // Best-effort: remove the stored image too
      if (ticket.image_path) {
        await supabase.storage.from('tickets').remove([ticket.image_path]).catch(() => {})
      }
      setTickets(prev => prev.filter(t => t.id !== ticket.id))
      setConfirmDelete(null)
    } catch (e) {
      alert('Could not delete: ' + e.message)
    } finally {
      setDeleting(false)
    }
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
            <div key={t.id} className="flex items-center gap-3.5 bg-surface border border-border-soft rounded-2xl py-3.5 px-4">
              <button onClick={() => nav('/editor/' + t.id)} className="flex items-center gap-3.5 flex-1 min-w-0 text-left">
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
              <button onClick={() => setConfirmDelete(t)} className="w-9 h-9 grid place-items-center rounded-xl text-text-mute hover:text-red hover:bg-red/10 flex-shrink-0" aria-label="Delete ticket">
                <Icon name="trash" className="w-4 h-4" />
              </button>
            </div>
          )
        })}
      </div>

      {/* Delete confirmation */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/75 z-[300] flex items-end justify-center" onClick={e => { if (e.target === e.currentTarget) setConfirmDelete(null) }}>
          <div className="w-full max-w-[440px] bg-surface rounded-t-3xl px-6 pt-4 pb-8 animate-slide-up">
            <div className="w-10 h-1 bg-surface-3 rounded-full mx-auto mb-4"></div>
            <div className="w-12 h-12 rounded-2xl bg-red/12 grid place-items-center mx-auto mb-3">
              <Icon name="trash" className="w-6 h-6 text-red" />
            </div>
            <h3 className="text-lg font-semibold text-center mb-1">Delete this ticket?</h3>
            <p className="text-sm text-text-dim text-center mb-1">
              WO #{confirmDelete.work_order || '—'} · {confirmDelete.vehicle_make} {confirmDelete.vehicle_model}
            </p>
            <p className="text-xs text-text-mute text-center mb-5">
              This removes it from your history and pay period. Use this if a ticket was reassigned or scanned by mistake. Can't be undone.
            </p>
            <div className="flex gap-2.5">
              <button onClick={() => setConfirmDelete(null)} className="flex-1 py-3.5 bg-surface-2 border border-border rounded-xl font-semibold text-sm">Keep It</button>
              <button onClick={() => deleteTicket(confirmDelete)} disabled={deleting} className="flex-1 py-3.5 bg-red text-white font-bold rounded-xl text-sm disabled:opacity-60">{deleting ? 'Deleting…' : 'Delete Ticket'}</button>
            </div>
          </div>
        </div>
      )}
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

  useLiveData(() => { if (user) load() }, [user])
  async function load() {
    const since = new Date(); since.setDate(since.getDate() - 120)
    const { data: t } = await supabase.from('tickets').select('*').eq('user_id', user.id).gte('ticket_date', since.toISOString())
    const { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    setTickets(t || [])
    setProfile(p)
  }

  const rate = parseFloat(profile?.hourly_rate || 0)

  // Current period (user-configured)
  const now = new Date()
  const period = getCurrentPeriod(profile, now)
  const prevStart = new Date(period.start); prevStart.setDate(period.start.getDate() - period.daysTotal)
  const prevEnd = new Date(period.start); prevEnd.setMilliseconds(-1)

  const periodTickets = tickets.filter(t => { const d = new Date(t.ticket_date); return d >= period.start && d <= period.end })
  const prevTickets = tickets.filter(t => { const d = new Date(t.ticket_date); return d >= prevStart && d < period.start })

  const periodHours = periodTickets.reduce((s, t) => s + parseFloat(t.total_flag_hours || 0), 0)
  const prevHours = prevTickets.reduce((s, t) => s + parseFloat(t.total_flag_hours || 0), 0)
  const pctDelta = prevHours > 0 ? Math.round(((periodHours - prevHours) / prevHours) * 100) : 0

  // Bars: hours per day across the period (cap display at 7 for weekly, 14 biweekly)
  const byDay = new Array(period.daysTotal).fill(0)
  periodTickets.forEach(t => {
    const d = new Date(t.ticket_date); d.setHours(0,0,0,0)
    const idx = Math.floor((d - period.start) / (24*60*60*1000))
    if (idx >= 0 && idx < period.daysTotal) byDay[idx] += parseFloat(t.total_flag_hours || 0)
  })
  const maxDay = Math.max(...byDay, 1)
  const bestVal = Math.max(...byDay)
  const elapsedDays = Math.max(1, period.daysElapsed)
  const avg = periodHours / elapsedDays
  const periodWord = period.daysTotal === 14 ? 'Period' : 'Week'

  // Day labels
  const dayLabels = []
  for (let i = 0; i < period.daysTotal; i++) {
    const d = new Date(period.start); d.setDate(period.start.getDate() + i)
    dayLabels.push(['S','M','T','W','T','F','S'][d.getDay()])
  }

  return (
    <AppShell title="Dashboard" subtitle="Your numbers at a glance" showBack>
      <div className="grid grid-cols-2 gap-3 px-5 mb-4">
        <MiniStat label={`This ${periodWord}`} value={periodHours.toFixed(1)} suffix="hrs" red delta={pctDelta} />
        <MiniStat label="Est. Gross" value={fmtMoney(periodHours * rate).replace(/\.\d+/, '')} suffix=".00" privateValue blurred={!unlocked} />
        <MiniStat label="Best Day" value={bestVal.toFixed(1)} suffix=" hrs" />
        <MiniStat label="Avg / Day" value={avg.toFixed(1)} suffix=" hrs" />
      </div>

      <div className="mx-5 mb-4 p-5 bg-surface border border-border-soft rounded-3xl">
        <div className="flex justify-between items-center mb-4">
          <div className="text-sm font-semibold">Flag Hours · This {periodWord}</div>
          <span className="text-xs text-text-mute">{periodRangeLabel(period)}</span>
        </div>
        <div className="flex gap-1.5 items-end h-32 px-1">
          {byDay.map((h, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-2">
              <div className="w-full bg-gradient-to-b from-red to-[#8B0E18] rounded-t-md min-h-[4px] shadow-[0_-4px_12px_rgba(225,29,42,0.2)]" style={{ height: `${Math.max(4, (h / maxDay) * 100)}%` }}></div>
              <div className="text-[10px] text-text-mute font-medium tracking-wider">{dayLabels[i]}</div>
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
        <ProjRow label="Earned so far" value={fmtMoney(periodHours * rate)} blurred={!unlocked} />
        <ProjRow label={`${periodWord} projected`} value={fmtMoney(avg * period.daysTotal * rate)} blurred={!unlocked} />
        <ProjRow label="Daily Avg" value={fmtMoney(avg * rate)} blurred={!unlocked} />
        <ProjRow label="Monthly (est)" value={fmtMoney(avg * 30 * rate)} blurred={!unlocked} />
        <ProjRow label="Yearly (est)" value={fmtMoney(avg * 365 * rate)} blurred={!unlocked} />
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
  const nav = useNavigate()
  const [profile, setProfile] = useState(null)
  const [periodHours, setPeriodHours] = useState(0)

  useLiveData(() => { if (user) load() }, [user])
  async function load() {
    const { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    setProfile(p)
    const period = getCurrentPeriod(p, new Date())
    const { data: tickets } = await supabase
      .from('tickets').select('total_flag_hours, ticket_date').eq('user_id', user.id)
      .gte('ticket_date', period.start.toISOString()).lte('ticket_date', period.end.toISOString())
    setPeriodHours((tickets || []).reduce((s, t) => s + parseFloat(t.total_flag_hours || 0), 0))
  }

  if (!profile) return <AppShell title="Goals" subtitle="Track what matters" showBack><div className="px-5 text-text-dim text-sm">Loading…</div></AppShell>

  const period = getCurrentPeriod(profile, new Date())
  const rate = parseFloat(profile.hourly_rate || 0)
  const goalAmount = parseFloat(profile.period_goal_amount || 2500)
  const earned = periodHours * rate
  const pct = Math.min(100, Math.round((earned / goalAmount) * 100))
  const hoursNeeded = rate > 0 ? goalAmount / rate : 0
  const hoursToGo = Math.max(0, hoursNeeded - periodHours)
  const pace = paceStatus(period, earned, goalAmount)
  const periodWord = period.daysTotal === 14 ? 'Biweekly' : 'Weekly'

  return (
    <AppShell title="Goals" subtitle="Track what matters" showBack>
      <div className="px-5 grid gap-3">
        {/* Main income goal card */}
        <div className="bg-surface border border-border-soft rounded-3xl p-5">
          <div className="flex justify-between items-start mb-4">
            <div>
              <div className="text-base font-semibold">{periodWord} Income Goal</div>
              <div className="text-[11px] text-text-mute tracking-wider uppercase mt-1">{periodRangeLabel(period)}</div>
            </div>
            <button onClick={() => nav('/settings')} className="text-xs text-red font-medium inline-flex items-center gap-1">
              <Icon name="edit" className="w-3.5 h-3.5" /> Edit
            </button>
          </div>

          <div className="flex items-baseline justify-between">
            <div className="text-red text-5xl font-bold tracking-tight leading-none flex items-baseline">
              {pct}<span className="text-2xl">%</span>
            </div>
            <div className="text-right">
              <div className="text-xl font-bold font-mono">{fmtMoney(earned)}</div>
              <div className="text-sm text-text-dim">of {fmtMoney(goalAmount)}</div>
            </div>
          </div>

          <div className="my-4 h-2 bg-surface-3 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-red to-red-hover rounded-full transition-all" style={{ width: `${pct}%` }} />
          </div>

          <div className="grid grid-cols-3 gap-2 text-center">
            <GoalStat label="Hours done" value={periodHours.toFixed(1)} />
            <GoalStat label="Hours to go" value={hoursToGo.toFixed(1)} accent />
            <GoalStat label="Days left" value={period.daysLeft} />
          </div>

          <div className={`mt-4 text-center text-sm font-medium ${pace.tone === 'green' ? 'text-green' : pace.tone === 'red' ? 'text-red' : 'text-text-dim'}`}>
            {pace.label}
          </div>
        </div>

        {/* Hours target derived card */}
        <div className="bg-surface border border-border-soft rounded-3xl p-5">
          <div className="text-sm font-semibold mb-1">Flag Hours Target</div>
          <div className="text-xs text-text-mute mb-3">To hit {fmtMoney(goalAmount)} at your rate</div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold font-mono text-text-main">{hoursNeeded.toFixed(1)}</span>
            <span className="text-sm text-text-dim">hrs needed this {periodWord.toLowerCase().replace('ly','')}</span>
          </div>
        </div>
      </div>
    </AppShell>
  )
}

function GoalStat({ label, value, accent }) {
  return (
    <div className="bg-surface-2 border border-border-soft rounded-xl py-2.5">
      <div className={`text-lg font-bold font-mono ${accent ? 'text-red' : ''}`}>{value}</div>
      <div className="text-[9px] tracking-wider uppercase text-text-mute mt-0.5 font-semibold">{label}</div>
    </div>
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
  const [savingField, setSavingField] = useState('')

  useEffect(() => { if (user) load() }, [user])
  async function load() {
    const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    setProfile(data)
  }

  async function updateProfile(patch, fieldName = '') {
    setSavingField(fieldName)
    setProfile(p => ({ ...p, ...patch }))
    await supabase.from('profiles').update(patch).eq('id', user.id)
    setSavingField('')
  }

  const DAYS = [['Sun',0],['Mon',1],['Tue',2],['Wed',3],['Thu',4],['Fri',5],['Sat',6]]
  const mode = profile?.pay_period_mode || 'weekly'
  const startDay = profile?.pay_period_start_day ?? 0

  return (
    <AppShell title="Settings" subtitle="Tune the app to your shop" showBack>
      <SettingsGroup title="Profile">
        <SettingsRow label="Full Name" sub={profile?.full_name || '—'} />
        <SettingsRow label="Email" sub={user?.email || '—'} />
        <EditableRow label="Shop" value={profile?.shop_name || ''} placeholder="Add your shop" onSave={v => updateProfile({ shop_name: v }, 'shop')} />
      </SettingsGroup>

      <SettingsGroup title="Pay">
        <div className="flex justify-between items-center px-5 py-4 border-b border-border-soft">
          <div>
            <div className="text-sm font-medium">Hourly Flat Rate</div>
            <div className="text-xs text-text-mute mt-0.5">Per flagged hour · Private</div>
          </div>
          {unlocked && profile ? (
            <div className="flex items-center gap-2">
              <RateEditor value={profile.hourly_rate || 0} onSave={v => updateProfile({ hourly_rate: v }, 'rate')} />
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

        {/* Pay period goal */}
        <div className="flex justify-between items-center px-5 py-4 border-b border-border-soft">
          <div>
            <div className="text-sm font-medium">Pay Period Goal</div>
            <div className="text-xs text-text-mute mt-0.5">Income target per period</div>
          </div>
          <GoalEditor value={profile?.period_goal_amount || 2500} onSave={v => updateProfile({ period_goal_amount: v }, 'goal')} />
        </div>

        {/* Pay period mode */}
        <div className="px-5 py-4 border-b border-border-soft">
          <div className="text-sm font-medium mb-2.5">Pay Period</div>
          <div className="flex gap-2">
            {['weekly', 'biweekly'].map(m => (
              <button key={m} onClick={() => updateProfile({ pay_period_mode: m }, 'mode')}
                className={`flex-1 py-2.5 rounded-xl text-sm font-medium border capitalize ${mode === m ? 'bg-red/10 border-red text-red' : 'bg-surface-2 border-border-soft text-text-dim'}`}>
                {m}
              </button>
            ))}
          </div>
        </div>

        {/* Start day */}
        <div className="px-5 py-4 border-b border-border-soft last:border-b-0">
          <div className="text-sm font-medium mb-1">Period Starts On</div>
          <div className="text-xs text-text-mute mb-2.5">{mode === 'biweekly' ? 'First day of your 2-week period' : 'First day of your week'}</div>
          <div className="flex gap-1.5 flex-wrap">
            {DAYS.map(([label, val]) => (
              <button key={val} onClick={() => updateProfile({ pay_period_start_day: val, ...(mode === 'biweekly' ? { pay_period_anchor: nextDateForDay(val) } : {}) }, 'startday')}
                className={`flex-1 min-w-[38px] py-2 rounded-lg text-xs font-semibold border ${startDay === val ? 'bg-red text-white border-red' : 'bg-surface-2 border-border-soft text-text-dim'}`}>
                {label}
              </button>
            ))}
          </div>
        </div>
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

// Returns the next date (YYYY-MM-DD) matching the given weekday, used as biweekly anchor
function nextDateForDay(targetDay) {
  const today = new Date(); today.setHours(0,0,0,0)
  const diff = (targetDay - today.getDay() + 7) % 7
  const d = new Date(today); d.setDate(today.getDate() - (7 - diff) % 7) // most recent occurrence
  // use most recent occurrence on/before today as the anchor
  const back = (today.getDay() - targetDay + 7) % 7
  const anchor = new Date(today); anchor.setDate(today.getDate() - back)
  return anchor.toISOString().slice(0,10)
}

function RateEditor({ value, onSave }) {
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState(value)
  if (!editing) return (
    <button onClick={() => { setVal(value); setEditing(true) }} className="text-red font-bold font-mono">{fmtMoney(value)}</button>
  )
  return (
    <input autoFocus type="number" step="0.01" value={val} onChange={e => setVal(e.target.value)}
      onBlur={() => { onSave(parseFloat(val) || 0); setEditing(false) }}
      onKeyDown={e => { if (e.key === 'Enter') { onSave(parseFloat(val) || 0); setEditing(false) } }}
      className="w-24 bg-surface-2 border border-red rounded-lg px-2 py-1 text-right text-red font-bold font-mono" />
  )
}

function GoalEditor({ value, onSave }) {
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState(value)
  if (!editing) return (
    <button onClick={() => { setVal(value); setEditing(true) }} className="text-text-main font-bold font-mono">{fmtMoney(value)}</button>
  )
  return (
    <input autoFocus type="number" step="50" value={val} onChange={e => setVal(e.target.value)}
      onBlur={() => { onSave(parseFloat(val) || 0); setEditing(false) }}
      onKeyDown={e => { if (e.key === 'Enter') { onSave(parseFloat(val) || 0); setEditing(false) } }}
      className="w-28 bg-surface-2 border border-red rounded-lg px-2 py-1 text-right text-text-main font-bold font-mono" />
  )
}

function EditableRow({ label, value, placeholder, onSave }) {
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState(value)
  return (
    <div className="flex justify-between items-center px-5 py-4 border-b border-border-soft last:border-b-0">
      <div className="text-sm font-medium">{label}</div>
      {editing ? (
        <input autoFocus value={val} onChange={e => setVal(e.target.value)}
          onBlur={() => { onSave(val); setEditing(false) }}
          onKeyDown={e => { if (e.key === 'Enter') { onSave(val); setEditing(false) } }}
          className="w-40 bg-surface-2 border border-red rounded-lg px-2 py-1 text-right text-sm" />
      ) : (
        <button onClick={() => { setVal(value); setEditing(true) }} className={`text-sm ${value ? 'text-text-dim' : 'text-text-mute'}`}>
          {value || placeholder}
        </button>
      )}
    </div>
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
