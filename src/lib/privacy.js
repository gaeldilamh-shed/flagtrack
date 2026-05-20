import { useEffect, useState } from 'react'

const STORAGE_KEY_GOAL_MONEY = 'ft_hide_goal_money'

// Rate unlock - in-memory only, never persisted, auto-relock after 10s
let rateUnlocked = false
let rateTimer = null
const listeners = new Set()

export function unlockRate() {
  rateUnlocked = true
  clearTimeout(rateTimer)
  rateTimer = setTimeout(lockRate, 10000)
  listeners.forEach(fn => fn(true))
}

export function lockRate() {
  rateUnlocked = false
  clearTimeout(rateTimer)
  listeners.forEach(fn => fn(false))
}

export function useRateLock() {
  const [unlocked, setUnlocked] = useState(rateUnlocked)
  useEffect(() => {
    const fn = (v) => setUnlocked(v)
    listeners.add(fn)
    return () => listeners.delete(fn)
  }, [])
  return { unlocked, unlock: unlockRate, lock: lockRate }
}

// Goal money hide - persisted per-device
export function useGoalMoneyHidden() {
  const [hidden, setHidden] = useState(() => {
    if (typeof window === 'undefined') return false
    return localStorage.getItem(STORAGE_KEY_GOAL_MONEY) === '1'
  })
  const toggle = () => {
    setHidden(h => {
      const next = !h
      localStorage.setItem(STORAGE_KEY_GOAL_MONEY, next ? '1' : '0')
      return next
    })
  }
  return { hidden, toggle }
}

// Format currency
export function fmtMoney(n, currency = 'USD') {
  const symbol = { USD: '$', CAD: '$', GBP: '£', EUR: '€' }[currency] || '$'
  return `${symbol}${Number(n || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`
}
