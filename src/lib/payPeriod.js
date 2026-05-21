// FlagTrack — Pay Period engine
// Computes the current pay-period window based on the user's settings,
// plus pacing math (how far along the period you are vs. how far toward goal).

// profile fields used:
//   pay_period_mode: 'weekly' | 'biweekly'   (default 'weekly')
//   pay_period_start_day: 0-6 (0=Sun ... 6=Sat) (default 0 = Sunday)
//   pay_period_anchor: 'YYYY-MM-DD' (a known period start date, for biweekly alignment)

const MS_DAY = 24 * 60 * 60 * 1000

function startOfDay(d) {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

// Get the current pay period { start, end, daysTotal, daysElapsed, daysLeft }
export function getCurrentPeriod(profile, now = new Date()) {
  const mode = profile?.pay_period_mode || 'weekly'
  const startDay = profile?.pay_period_start_day ?? 0 // default Sunday
  const today = startOfDay(now)

  // Find the most recent occurrence of startDay on or before today
  const dow = today.getDay()
  let diff = dow - startDay
  if (diff < 0) diff += 7
  let periodStart = new Date(today)
  periodStart.setDate(today.getDate() - diff)

  let lengthDays = 7
  if (mode === 'biweekly') {
    lengthDays = 14
    // Align to the anchor so the 2-week blocks are consistent
    const anchorStr = profile?.pay_period_anchor
    if (anchorStr) {
      const anchor = startOfDay(new Date(anchorStr + 'T00:00:00'))
      // Number of whole weeks between anchor and this weekly-start
      const weeks = Math.round((periodStart - anchor) / (7 * MS_DAY))
      // If we're on an odd week from the anchor, step back one week to the block start
      if (((weeks % 2) + 2) % 2 === 1) {
        periodStart.setDate(periodStart.getDate() - 7)
      }
    }
  }

  const periodEnd = new Date(periodStart)
  periodEnd.setDate(periodStart.getDate() + lengthDays - 1)
  periodEnd.setHours(23, 59, 59, 999)

  const daysElapsed = Math.floor((today - periodStart) / MS_DAY) + 1 // inclusive of today
  const daysLeft = Math.max(0, lengthDays - daysElapsed)

  return {
    start: periodStart,
    end: periodEnd,
    daysTotal: lengthDays,
    daysElapsed: Math.min(daysElapsed, lengthDays),
    daysLeft,
    mode,
  }
}

// Smart pacing: where SHOULD you be by now (fraction 0-1) given days elapsed.
export function expectedPaceFraction(period) {
  if (!period.daysTotal) return 0
  return Math.min(1, period.daysElapsed / period.daysTotal)
}

// Given goal $, earned $, and the period, return a pacing verdict.
export function paceStatus(period, earned, goal) {
  if (!goal || goal <= 0) return { label: 'No goal set', tone: 'dim', onPace: true }
  const expectedByNow = goal * expectedPaceFraction(period)
  const delta = earned - expectedByNow
  const pct = goal > 0 ? earned / goal : 0
  if (pct >= 1) return { label: 'Goal hit', tone: 'green', onPace: true }
  if (delta >= -0.001) return { label: 'On pace', tone: 'green', onPace: true }
  // Behind — by how much?
  const behindPct = Math.round((Math.abs(delta) / goal) * 100)
  return { label: `${behindPct}% behind pace`, tone: 'red', onPace: false }
}

// Friendly label for the current period range, e.g. "May 18 – May 24"
export function periodRangeLabel(period) {
  const opt = { month: 'short', day: 'numeric' }
  return `${period.start.toLocaleDateString('en-US', opt)} – ${period.end.toLocaleDateString('en-US', opt)}`
}
