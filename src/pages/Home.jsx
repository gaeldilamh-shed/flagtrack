import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppShell } from '../components/AppShell'
import { Icon } from '../components/Icon'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { useGoalMoneyHidden, fmtMoney } from '../lib/privacy'

export function Home() {
  const nav = useNavigate()
  const { user } = useAuth()
  const { hidden: goalMoneyHidden, toggle: toggleGoalMoney } = useGoalMoneyHidden()
  const [profile, setProfile] = useState(null)
  const [stats, setStats] = useState({
    weekHours: 0,
    weekPay: 0,
    weekGoal: 1500,
    hourGoal: 45,
    todayTickets: 0,
    weekTickets: 0,
    daysLeft: 0,
    needsHours: 0,
    estimated: 0,
  })

  useEffect(() => {
    if (!user) return
    loadData()
  }, [user])

  async function loadData() {
    // Load profile
    const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    setProfile(prof)

    // Compute week range (Mon-Sun)
    const now = new Date()
    const day = now.getDay() // 0=Sun, 1=Mon...
    const diff = day === 0 ? -6 : 1 - day
    const monday = new Date(now)
    monday.setDate(now.getDate() + diff)
    monday.setHours(0, 0, 0, 0)
    const sunday = new Date(monday)
    sunday.setDate(monday.getDate() + 6)
    sunday.setHours(23, 59, 59, 999)
    const daysLeft = Math.max(0, Math.ceil((sunday - now) / (1000 * 60 * 60 * 24)))

    // Today range
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(today.getDate() + 1)

    // Load tickets this week
    const { data: tickets } = await supabase
      .from('tickets')
      .select('id, ticket_date, total_flag_hours, status')
      .eq('user_id', user.id)
      .gte('ticket_date', monday.toISOString())
      .lte('ticket_date', sunday.toISOString())

    const weekHours = (tickets || []).reduce((s, t) => s + (parseFloat(t.total_flag_hours) || 0), 0)
    const rate = parseFloat(prof?.hourly_rate || 0)
    const weekPay = weekHours * rate

    const todayTickets = (tickets || []).filter(t => {
      const d = new Date(t.ticket_date)
      return d >= today && d < tomorrow
    }).length

    // Load active goals
    const { data: goals } = await supabase
      .from('goals')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)

    const incomeGoal = goals?.find(g => g.goal_type === 'income' && g.period === 'weekly')
    const hourGoal = goals?.find(g => g.goal_type === 'hours' && g.period === 'weekly')

    // Count lines that still need attention this week (needs_hours + estimated)
    let needsHours = 0, estimated = 0
    const ticketIds = (tickets || []).map(t => t.id)
    if (ticketIds.length > 0) {
      const { data: revLines } = await supabase
        .from('ticket_lines')
        .select('status, ticket_id')
        .in('ticket_id', ticketIds)
      needsHours = (revLines || []).filter(l => l.status === 'needs_hours').length
      estimated = (revLines || []).filter(l => l.status === 'estimated').length
    }

    setStats({
      weekHours: weekHours,
      weekPay,
      weekGoal: incomeGoal?.target_amount || 1500,
      hourGoal: hourGoal?.target_amount || 45,
      todayTickets,
      weekTickets: tickets?.length || 0,
      daysLeft,
      needsHours,
      estimated,
    })
  }

  const goalPct = Math.min(100, Math.round((stats.weekPay / stats.weekGoal) * 100))
  const remaining = Math.max(0, stats.weekGoal - stats.weekPay)
  const firstName = profile?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'Tech'

  return (
    <AppShell userName={profile?.full_name}>
      <div className="px-5 pt-2 pb-5">
        <h1 className="text-2xl font-bold tracking-tight">Welcome back, {firstName}!</h1>
        <p className="text-sm text-text-dim mt-1">Let's keep crushing your goals.</p>
      </div>

      {/* Review reminder - surfaces lines that need attention before payday */}
      {(stats.needsHours > 0 || stats.estimated > 0) && (
        <button onClick={() => nav('/history')} className="mx-5 mb-4 w-[calc(100%-40px)] flex items-center gap-3 bg-amber/[0.08] border border-amber/25 rounded-2xl px-4 py-3 text-left hover:bg-amber/[0.12]">
          <div className="w-9 h-9 rounded-xl bg-amber/15 grid place-items-center flex-shrink-0">
            <Icon name="info" className="w-[18px] h-[18px] text-amber" />
          </div>
          <div className="flex-1">
            <div className="text-sm font-semibold text-text-main">
              {stats.needsHours > 0 && `${stats.needsHours} ${stats.needsHours === 1 ? 'service needs' : 'services need'} hours`}
              {stats.needsHours > 0 && stats.estimated > 0 && ' · '}
              {stats.estimated > 0 && `${stats.estimated} estimated`}
            </div>
            <div className="text-xs text-text-dim mt-0.5">Tap to review before payday</div>
          </div>
          <Icon name="chevRight" className="w-4 h-4 text-text-mute" />
        </button>
      )}

      {/* Scan card */}
      <div className="mx-5 p-9 px-6 pb-7 text-center rounded-3xl border border-border-soft" style={{ background: 'radial-gradient(140% 100% at 50% 0%, rgba(225,29,42,0.06), transparent 50%), #15151A' }}>
        <div className="w-24 h-24 mx-auto mb-4 grid place-items-center text-red relative">
          <Icon name="camera" className="w-24 h-24" strokeWidth={1.5} />
        </div>
        <div className="text-xl font-bold tracking-wider mb-2.5">SCAN / UPLOAD TICKET</div>
        <p className="text-sm text-text-dim mb-5 max-w-[260px] mx-auto leading-relaxed">Take a photo or upload a ticket to calculate your flag hours.</p>
        <button onClick={() => nav('/upload')} className="inline-flex items-center justify-center gap-2.5 bg-red hover:bg-red-hover text-white font-bold text-sm tracking-wider px-9 py-3.5 rounded-full shadow-[0_10px_30px_rgba(225,29,42,0.35)] active:translate-y-0 hover:-translate-y-px transition-all">
          <Icon name="arrowUp" className="w-4 h-4" />
          UPLOAD TICKET
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-3 px-5 pt-4 mt-4">
        {/* Goal Progress */}
        <div className="bg-surface border border-border-soft rounded-3xl p-4">
          <div className="flex items-start justify-between mb-3.5">
            <div className="text-[11px] font-semibold tracking-widest text-text-dim uppercase">Goal Progress</div>
            <button className="bg-surface-3 border border-border rounded-full px-2.5 py-1 text-xs font-medium inline-flex items-center gap-1">
              Weekly<Icon name="chevDown" className="w-3 h-3" strokeWidth={2.5} />
            </button>
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <div className="text-red text-[44px] font-bold tracking-tight leading-none flex items-baseline">
              {goalPct}<span className="text-2xl font-semibold">%</span>
            </div>
            <div className="text-right cursor-pointer" onClick={toggleGoalMoney}>
              <div className="flex items-center gap-1.5 justify-end">
                <button className="w-6 h-6 grid place-items-center rounded-md text-text-mute hover:text-text-main hover:bg-surface-3">
                  <Icon name={goalMoneyHidden ? 'eyeOff' : 'eye'} className="w-3.5 h-3.5" />
                </button>
                <div>
                  <div className={`text-[17px] font-bold ${goalMoneyHidden ? 'private-blur' : ''}`}>
                    {fmtMoney(stats.weekPay)} <span className="text-text-mute font-medium text-sm">/ {fmtMoney(stats.weekGoal)}</span>
                  </div>
                </div>
              </div>
              <div className="text-xs text-text-dim mt-0.5 pr-1">Weekly Goal</div>
            </div>
          </div>
          <div className="my-3.5 h-1.5 bg-surface-3 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-red to-red-hover rounded-full" style={{ width: `${goalPct}%` }} />
          </div>
          <div className="flex justify-between items-center text-xs text-text-dim">
            <span>{stats.daysLeft} days left</span>
            <span className={`text-red font-medium ${goalMoneyHidden ? 'private-blur' : ''}`}>{fmtMoney(remaining)} to go</span>
          </div>
          <div className="h-px bg-border-soft my-3" />
          <div className="inline-flex items-center gap-1.5 text-red text-[13px] font-medium">
            <Icon name="trendUp" className="w-4 h-4" />
            On pace
          </div>
        </div>

        {/* Flag Hours */}
        <div className="bg-surface border border-border-soft rounded-3xl p-4">
          <div className="flex items-start justify-between mb-3.5">
            <div>
              <div className="text-[11px] font-semibold tracking-widest text-text-dim uppercase">Flag Hours</div>
              <div className="text-[11px] text-text-mute tracking-wider uppercase mt-0.5">This week</div>
            </div>
            <div className="w-11 h-11 border-2 border-red rounded-full grid place-items-center text-red">
              <Icon name="clock" className="w-5 h-5" />
            </div>
          </div>
          <div className="text-[44px] font-bold tracking-tight leading-none">{stats.weekHours.toFixed(1)}</div>
          <div className="text-sm text-text-dim mt-1">of <strong className="font-medium">{Number(stats.hourGoal).toFixed(1)} hrs</strong></div>

          <div className="flex gap-2 mt-2.5">
            <div className="flex-1 bg-surface-2 border border-border-soft rounded-lg py-2 px-2 text-center">
              <div className="text-[17px] font-bold leading-none font-mono">{stats.todayTickets}</div>
              <div className="text-[9px] tracking-wider uppercase text-text-mute mt-1 font-semibold">Today</div>
            </div>
            <div className="flex-1 bg-surface-2 border border-border-soft rounded-lg py-2 px-2 text-center">
              <div className="text-[17px] font-bold leading-none font-mono">{stats.weekTickets}</div>
              <div className="text-[9px] tracking-wider uppercase text-text-mute mt-1 font-semibold">Week</div>
            </div>
          </div>

          <div className="h-px bg-border-soft my-3" />
          <div className="flex items-center gap-1.5 text-xs text-text-dim">
            <Icon name="calendar" className="w-3.5 h-3.5 text-red" strokeWidth={1.8} />
            {weekRangeLabel()}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center gap-2.5 mt-6 mx-5 py-3.5 cursor-pointer" onClick={() => nav('/dashboard')}>
        <div className="w-[26px] h-[26px] border-[1.5px] border-red rounded-full grid place-items-center text-red">
          <Icon name="gauge" className="w-3.5 h-3.5" strokeWidth={2} />
        </div>
        <span className="font-medium text-[15px]">View Dashboard</span>
        <Icon name="chevRight" className="w-4 h-4" />
      </div>
    </AppShell>
  )
}

function weekRangeLabel() {
  const now = new Date()
  const day = now.getDay()
  const diff = day === 0 ? -6 : 1 - day
  const mon = new Date(now); mon.setDate(now.getDate() + diff)
  const sun = new Date(mon); sun.setDate(mon.getDate() + 6)
  const opt = { month: 'short', day: 'numeric' }
  return `${mon.toLocaleDateString('en-US', opt)} – ${sun.toLocaleDateString('en-US', opt)}`
}
