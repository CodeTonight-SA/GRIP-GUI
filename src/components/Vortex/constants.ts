/**
 * Vortex constants — double-helix parametric model and colour scheme.
 *
 * Mathematical model:
 *   x(t) = R * cos(omega * t + phi)
 *   y(t) = t * verticalSpeed
 *   z(t) = R * sin(omega * t + phi)
 *
 * Two strands with phi_A=0, phi_B=PI create the double-helix.
 * Connecting rungs every 5th pair bridge the strands.
 */

// Helix geometry
export const HELIX_RADIUS = 2.0
export const HELIX_OMEGA = (2 * Math.PI) / 6
export const HELIX_PHI_A = 0
export const HELIX_PHI_B = Math.PI
export const VERTICAL_SPEED = 0.5
export const SWIRL_SPEED = 0.3
export const HELIX_HEIGHT = 12
export const RUNG_INTERVAL = 5

// Particle counts by performance tier
export const PARTICLES_FULL = 2000
export const PARTICLES_REDUCED = 500

// Swiss Nihilism holographic colours
export const COLORS = {
  dark: {
    strandA: '#22d3ee',
    strandB: '#06b6d4',
    rungs: '#155e75',
    rungsOpacity: 0.15,
    background: '#0a0a0a',
  },
  light: {
    strandA: '#0891b2',
    strandB: '#0e7490',
    rungs: '#0891b2',
    rungsOpacity: 0.08,
    background: '#EAEAEA',
  },
} as const

// Concept orb colours (floating labels)
export const ORB_COLORS = {
  dark: {
    MODES: '#22d3ee',
    SKILLS: '#a78bfa',
    AGENTS: '#34d399',
    SAFETY: '#f87171',
    CONVERGENCE: '#fbbf24',
  },
  light: {
    MODES: '#0891b2',
    SKILLS: '#7c3aed',
    AGENTS: '#059669',
    SAFETY: '#dc2626',
    CONVERGENCE: '#d97706',
  },
} as const

// Bloom settings
export const BLOOM = {
  dark: { intensity: 0.6, luminanceThreshold: 0.3, luminanceSmoothing: 0.9 },
  light: { intensity: 0.3, luminanceThreshold: 0.5, luminanceSmoothing: 0.9 },
} as const

// Performance tiers
export type PerfTier = 'full' | 'reduced' | 'fallback'

// Konami code sequence
export const KONAMI_SEQUENCE = [
  'ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown',
  'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight',
  'b', 'a',
] as const

// Label positions on the helix (normalised t values 0-1)
export const LABEL_POSITIONS = [
  { name: 'MODES', t: 0.15, side: 'A' as const },
  { name: 'SKILLS', t: 0.35, side: 'B' as const },
  { name: 'AGENTS', t: 0.55, side: 'A' as const },
  { name: 'SAFETY', t: 0.75, side: 'B' as const },
  { name: 'CONVERGENCE', t: 0.9, side: 'A' as const },
] as const
