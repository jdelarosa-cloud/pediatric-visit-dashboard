import { useEffect, useState } from 'react'

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'

function currentPreference(): boolean {
  return window.matchMedia(REDUCED_MOTION_QUERY).matches
}

export function usePrefersReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(currentPreference)

  useEffect(() => {
    const media = window.matchMedia(REDUCED_MOTION_QUERY)
    const updatePreference = (event: MediaQueryListEvent) => setPrefersReducedMotion(event.matches)
    media.addEventListener('change', updatePreference)
    return () => media.removeEventListener('change', updatePreference)
  }, [])

  return prefersReducedMotion
}
