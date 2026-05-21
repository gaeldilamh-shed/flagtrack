import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'

// Calls `fn` when:
//  - the component mounts
//  - the route location changes (navigating back to this page)
//  - the tab/app becomes visible again (focus / foreground)
//  - the window regains focus
// This keeps screens fresh after confirming a ticket, switching tabs, or
// returning to the app from the background.
export function useLiveData(fn, deps = []) {
  const loc = useLocation()
  const fnRef = useRef(fn)
  fnRef.current = fn

  useEffect(() => {
    // run on mount + whenever deps or route change
    fnRef.current()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loc.key, loc.pathname, ...deps])

  useEffect(() => {
    const onVisible = () => { if (document.visibilityState === 'visible') fnRef.current() }
    const onFocus = () => fnRef.current()
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', onFocus)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', onFocus)
    }
  }, [])
}
