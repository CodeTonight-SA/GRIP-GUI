'use client'

import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import { COLORS, BLOOM } from './constants'
import { useVortexConfig } from './useVortexConfig'
import HelixParticles from './HelixParticles'
import HelixStrands from './HelixStrands'
import FloatingLabels from './FloatingLabels'
import VortexFallback from './VortexFallback'
import './HolographicMaterial'

interface VortexSceneProps {
  /** Fixed height in pixels (e.g. for embedded hero). Omit for full viewport. */
  height?: number
  /** Auto-rotate without user interaction */
  autoRotate?: boolean
  /** Show floating concept labels */
  showLabels?: boolean
  /** Override performance tier */
  forceTier?: 'full' | 'reduced' | 'fallback'
}

/**
 * The complete Vortex 3D scene.
 *
 * Renders a double-helix DNA structure with flowing particles, tube backbones,
 * connecting rungs, floating concept labels, and holographic bloom effects.
 *
 * Automatically selects performance tier based on device capabilities:
 * - Full:     Desktop + WebGL2, 2000 particles, bloom
 * - Reduced:  Mobile + WebGL2, 500 particles, no bloom
 * - Fallback: No WebGL, CSS-only 2D animation
 */
export default function VortexScene({
  height,
  autoRotate = true,
  showLabels = true,
  forceTier,
}: VortexSceneProps) {
  const config = useVortexConfig()
  const tier = forceTier || config.tier
  const { darkMode, reducedMotion, dpr } = config

  const particleCount = tier === 'full' ? 2000 : 500
  const enableBloom = tier === 'full' && !reducedMotion

  const colors = darkMode ? COLORS.dark : COLORS.light
  const bloom = darkMode ? BLOOM.dark : BLOOM.light

  // CSS fallback for no WebGL
  if (tier === 'fallback') {
    return (
      <div style={{ width: '100%', height: height || '100vh' }}>
        <VortexFallback darkMode={darkMode} />
      </div>
    )
  }

  return (
    <div
      style={{
        width: '100%',
        height: height || '100vh',
        background: colors.background,
      }}
    >
      <Canvas
        dpr={dpr}
        camera={{ position: [0, 0, 8], fov: 50 }}
        style={{ background: 'transparent' }}
        gl={{
          antialias: tier === 'full',
          alpha: true,
          powerPreference: tier === 'full' ? 'high-performance' : 'low-power',
        }}
      >
        <Suspense fallback={null}>
          {/* Ambient light for base visibility */}
          <ambientLight intensity={0.15} />

          {/* Directional light for depth */}
          <directionalLight position={[5, 5, 5]} intensity={0.3} />
          <directionalLight position={[-5, -5, -5]} intensity={0.1} />

          {/* Helix backbone tubes */}
          <HelixStrands
            darkMode={darkMode}
            colorA={colors.strandA}
            colorB={colors.strandB}
            rungColor={colors.rungs}
            rungOpacity={colors.rungsOpacity}
            reducedMotion={reducedMotion}
          />

          {/* Flowing particles along helix */}
          <HelixParticles
            count={particleCount}
            darkMode={darkMode}
            colorA={colors.strandA}
            colorB={colors.strandB}
            reducedMotion={reducedMotion}
          />

          {/* Concept labels */}
          {showLabels && (
            <FloatingLabels
              darkMode={darkMode}
              reducedMotion={reducedMotion}
            />
          )}

          {/* Camera controls */}
          <OrbitControls
            autoRotate={autoRotate && !reducedMotion}
            autoRotateSpeed={0.5}
            enableZoom={true}
            enablePan={false}
            minDistance={4}
            maxDistance={15}
            maxPolarAngle={Math.PI * 0.85}
            minPolarAngle={Math.PI * 0.15}
          />

          {/* Bloom post-processing */}
          {enableBloom && (
            <EffectComposer>
              <Bloom
                intensity={bloom.intensity}
                luminanceThreshold={bloom.luminanceThreshold}
                luminanceSmoothing={bloom.luminanceSmoothing}
              />
            </EffectComposer>
          )}
        </Suspense>
      </Canvas>
    </div>
  )
}
