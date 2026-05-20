import { useState, useEffect } from 'react'
import { Icon } from './Icon'
import { unlockRate } from '../lib/privacy'

export function UnlockModal({ open, onClose, onUnlocked }) {
  const [pinCount, setPinCount] = useState(0)

  useEffect(() => { if (open) setPinCount(0) }, [open])

  const press = () => {
    const next = pinCount + 1
    setPinCount(next)
    if (next >= 4) {
      setTimeout(() => {
        unlockRate()
        onUnlocked?.()
        onClose()
      }, 200)
    }
  }

  const confirmBio = () => {
    unlockRate()
    onUnlocked?.()
    onClose()
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 bg-black/75 z-[300] flex items-end justify-center" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="w-full max-w-[440px] bg-surface rounded-t-3xl px-6 pt-4 pb-8 animate-slide-up text-center">
        <div className="w-10 h-1 bg-surface-3 rounded-full mx-auto mb-4"></div>
        <h3 className="text-lg font-semibold mb-1">Unlock Your Rate</h3>
        <p className="text-sm text-text-dim mb-1">Your hourly rate is private. Verify to view.</p>

        <button onClick={confirmBio} className="w-16 h-16 mx-auto mt-4 grid place-items-center bg-red/12 border-[1.5px] border-red rounded-2xl text-red hover:bg-red/20 active:scale-95 transition-all">
          <Icon name="face" className="w-8 h-8" strokeWidth={1.8} />
        </button>
        <div className="text-xs text-text-mute mb-4 mt-2">Tap to use Face ID</div>

        <div className="flex justify-center gap-3.5 my-5">
          {[0, 1, 2, 3].map(i => (
            <div key={i} className={`w-3.5 h-3.5 rounded-full border-[1.5px] ${i < pinCount ? 'bg-red border-red' : 'border-text-mute'}`}></div>
          ))}
        </div>
        <div className="text-[11px] text-text-mute tracking-wider uppercase mb-2">Or enter PIN</div>

        <div className="grid grid-cols-3 gap-3 max-w-[280px] mx-auto mt-3">
          {[1,2,3,4,5,6,7,8,9].map(n => (
            <button key={n} onClick={press} className="aspect-[1.4/1] bg-surface-2 border border-border-soft rounded-xl text-xl font-semibold hover:bg-surface-3 active:scale-95 transition-all">{n}</button>
          ))}
          <div></div>
          <button onClick={press} className="aspect-[1.4/1] bg-surface-2 border border-border-soft rounded-xl text-xl font-semibold hover:bg-surface-3 active:scale-95 transition-all">0</button>
          <button onClick={onClose} className="aspect-[1.4/1] grid place-items-center text-text-mute">✕</button>
        </div>
      </div>
    </div>
  )
}
