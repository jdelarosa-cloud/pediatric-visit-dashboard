import { useEffect, useState } from 'react'

export function useDelayedPending(active: boolean, delay = 150): boolean {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const timeout = window.setTimeout(() => setVisible(active), active ? delay : 0)
    return () => window.clearTimeout(timeout)
  }, [active, delay])

  return active && visible
}
