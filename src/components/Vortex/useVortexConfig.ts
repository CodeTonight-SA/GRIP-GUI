'use client'

import { useEffect, useState, useCallback } from 'react'
import { PARTICLES_FULL, PARTICLES_REDUCED, type PerfTier } from './constants'

/**
 * Hook that determines the best performance tier for Vortex rendering.
 *
 * Full:     Desktop + WebGL2 — 2000 particles/strand, bloom, DPR [1,2]
 * Reduced:  Mobile + WebGL2  — 500 particles/strand, no bloom, DPR 1
 * Fallback: No WebGL         — CSS-only 2D fallback
 */
export function useVortexConfig() {
  const [tier, setTier] = useState<PerfTier>('fallback')
  const [darkMode, setDarkMode] = useState(true)
  const [reducedMotion, setReducedMotion] = useState(false)

  useEffect(() => {
    // Detect WebGL support
    try {
      const canvas = document.createElement('canvas')
      const gl = canvas.getContext('webgl2') || canvas.getContext('webgl')
      if (!gl) {
        setTier('fallback')
        return
      }

      // Detect mobile
      const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
        || window.innerWidth < 768

      setTier(isMobile ? 'reduced' : 'full')
    } catch {
      setTier('fallback')
    }

    // Detect dark mode
    const isDark = document.documentElement.classList.contains('dark')
    setDarkMode(isDark)

    // Watch for dark mode changes
    const observer = new MutationObserver(() => {
      setDarkMode(document.documentElement.classList.contains('dark'))
    })
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    })

    // Detect reduced motion preference
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReducedMotion(mq.matches)
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches)
    mq.addEventListener('change', handler)

    return () => {
      observer.disconnect()
      mq.removeEventListener('change', handler)
    }
  }, [])

  const particleCount = tier === 'full' ? PARTICLES_FULL : PARTICLES_REDUCED
  const enableBloom = tier === 'full' && !reducedMotion
  const dpr: [number, number] = tier === 'full' ? [1, 2] : [1, 1]

  return {
    tier,
    darkMode,
    reducedMotion,
    particleCount,
    enableBloom,
    dpr,
  }
}

/**
 * Hook for detecting the Konami code key sequence.
 */
export function useKonamiTrigger(onTrigger: () => void) {
  const [index, setIndex] = useState(0)

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const KONAMI = [
      'ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown',
      'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight',
      'b', 'a',
    ]

    if (e.key === KONAMI[index]) {
      const next = index + 1
      if (next === KONAMI.length) {
        onTrigger()
        setIndex(0)
      } else {
        setIndex(next)
      }
    } else {
      setIndex(e.key === KONAMI[0] ? 1 : 0)
    }
  }, [index, onTrigger])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])
}
