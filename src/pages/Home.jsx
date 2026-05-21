import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { AppShell } from '../components/AppShell'
import { Icon } from '../components/Icon'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { useGoalMoneyHidden, fmtMoney } from '../lib/privacy'
import { getCurrentPeriod, paceStatus, periodRangeLabel } from '../lib/payPeriod'

export function Home() {
  const nav = useNavigate()
  const loc = useLocation()
  const { user } = useAuth()
  const { hidden: goalMoneyHidden, toggle: toggleGoalMoney } = useGoalMoneyHidden()
  const [profile, setProfile] = useState(null)
  const [stats, setStats] = useState({
    periodHours: 0,
    periodPay: 0,
    goalAmount: 2500,
    hoursNeeded: 0,
    todayTickets: 0,
    periodTickets: 0,
    daysLeft: 0,
    daysTotal: 7,
    needsHours: 0,
    estimated: 0,
    rate: 0,
    periodLabel: '',
    pace: { label: '', tone: 'dim', onPace: true },
  })

  // Reload whenever we navigate back to Home (e.g. after confirming a ticket)
  useEffect(() => {
    if (!user) return
    loadData()
  }, [user, loc.key])

  async function loadData() {
    const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    setProfile(prof)

    const now = new Date()
    const period = getCurrentPeriod(prof, now)

    // Today range
    const today = new Date(); today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1)

    // Load tickets in the current pay period
    const { data: tickets } = await supabase
      .from('tickets')
      .select('id, ticket_date, total_flag_hours, status')
      .eq('user_id', user.id)
      .gte('ticket_date', period.start.toISOString())
      .lte('ticket_date', period.end.toISOString())

    const periodHours = (tickets || []).reduce((s, t) => s + (parseFloat(t.total_flag_hours) || 0), 0)
    const rate = parseFloat(prof?.hourly_rate || 0)
    const periodPay = periodHours * rate

    const todayTickets = (tickets || []).filter(t => {
      const d = new Date(t.ticket_date)
      return d >= today && d < tomorrow
    }).length

    const goalAmount = parseFloat(prof?.period_goal_amount || 2500)
    const hoursNeeded = rate > 0 ? goalAmount / rate : 0

    // Count lines needing attention in this period
    let needsHours = 0, estimated = 0
    const ticketIds = (tickets || []).map(t => t.id)
    if (ticketIds.length > 0) {
      const { data: revLines } = await supabase
        .from('ticket_lines').select('status, ticket_id').in('ticket_id', ticketIds)
      needsHours = (revLines || []).filter(l => l.status === 'needs_hours').length
      estimated = (revLines || []).filter(l => l.status === 'estimated').length
    }

    const pace = paceStatus(period, periodPay, goalAmount)

    setStats({
      periodHours,
      periodPay,
      goalAmount,
      hoursNeeded,
      todayTickets,
      periodTickets: tickets?.length || 0,
      daysLeft: period.daysLeft,
      daysTotal: period.daysTotal,
      needsHours,
      estimated,
      rate,
      periodLabel: periodRangeLabel(period),
      pace,
    })
  }

  const goalPct = Math.min(100, Math.round((stats.periodPay / stats.goalAmount) * 100))
  const remaining = Math.max(0, stats.goalAmount - stats.periodPay)
  const hoursToGo = Math.max(0, stats.hoursNeeded - stats.periodHours)
  const firstName = profile?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'Tech'
  const periodWord = stats.daysTotal === 14 ? 'Biweekly' : 'Weekly'

  return (
    <AppShell userName={profile?.full_name}>
      <div className="px-5 pt-2 pb-5">
        <h1 className="text-2xl font-bold tracking-tight">Welcome back, {firstName}!</h1>
        <p className="text-sm text-text-dim mt-1">Let's keep crushing your goals.</p>
      </div>

      {/* Review reminder */}
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
            <button onClick={() => nav('/goals')} className="bg-surface-3 border border-border rounded-full px-2.5 py-1 text-xs font-medium inline-flex items-center gap-1">
              {periodWord}<Icon name="chevDown" className="w-3 h-3" strokeWidth={2.5} />
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
                    {fmtMoney(stats.periodPay)} <span className="text-text-mute font-medium text-sm">/ {fmtMoney(stats.goalAmount)}</span>
                  </div>
                </div>
              </div>
              <div className="text-xs text-text-dim mt-0.5 pr-1">{periodWord} Goal</div>
            </div>
          </div>
          <div className="my-3.5 h-1.5 bg-surface-3 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-red to-red-hover rounded-full transition-all" style={{ width: `${goalPct}%` }} />
          </div>
          <div className="flex justify-between items-center text-xs text-text-dim">
            <span>{stats.daysLeft} days left</span>
            <span className={`text-red font-medium ${goalMoneyHidden ? 'private-blur' : ''}`}>{fmtMoney(remaining)} to go</span>
          </div>
          {/* Hours needed - always visible for motivation */}
          <div className="mt-2 flex justify-between items-center text-xs">
            <span className="text-text-dim">Hours to goal</span>
            <span className="font-mono font-semibold text-text-main">{hoursToGo.toFixed(1)} hr left</span>
          </div>
          <div className="h-px bg-border-soft my-3" />
          <div className={`inline-flex items-center gap-1.5 text-[13px] font-medium ${stats.pace.tone === 'green' ? 'text-green' : stats.pace.tone === 'red' ? 'text-red' : 'text-text-dim'}`}>
            <Icon name="trendUp" className="w-4 h-4" />
            {stats.pace.label}
          </div>
        </div>

        {/* Flag Hours */}
        <div className="bg-surface border border-border-soft rounded-3xl p-4">
          <div className="flex items-start justify-between mb-3.5">
            <div>
              <div className="text-[11px] font-semibold tracking-widest text-text-dim uppercase">Flag Hours</div>
              <div className="text-[11px] text-text-mute tracking-wider uppercase mt-0.5">This {periodWord === 'Biweekly' ? 'period' : 'week'}</div>
            </div>
            <div className="w-11 h-11 border-2 border-red rounded-full grid place-items-center text-red">
              <Icon name="clock" className="w-5 h-5" />
            </div>
          </div>
          <div className="text-[44px] font-bold tracking-tight leading-none">{stats.periodHours.toFixed(1)}</div>
          <div className="text-sm text-text-dim mt-1">of <strong className="font-medium">{stats.hoursNeeded.toFixed(1)} hrs</strong></div>

          <div className="flex gap-2 mt-2.5">
            <div className="flex-1 bg-surface-2 border border-border-soft rounded-lg py-2 px-2 text-center">
              <div className="text-[17px] font-bold leading-none font-mono">{stats.todayTickets}</div>
              <div className="text-[9px] tracking-wider uppercase text-text-mute mt-1 font-semibold">Today</div>
            </div>
            <div className="flex-1 bg-surface-2 border border-border-soft rounded-lg py-2 px-2 text-center">
              <div className="text-[17px] font-bold leading-none font-mono">{stats.periodTickets}</div>
              <div className="text-[9px] tracking-wider uppercase text-text-mute mt-1 font-semibold">Period</div>
            </div>
          </div>

          <div className="h-px bg-border-soft my-3" />
          <div className="flex items-center gap-1.5 text-xs text-text-dim">
            <Icon name="calendar" className="w-3.5 h-3.5 text-red" strokeWidth={1.8} />
            {stats.periodLabel}
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
