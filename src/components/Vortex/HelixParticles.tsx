'use client'

import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import {
  HELIX_RADIUS, HELIX_OMEGA, HELIX_PHI_A, HELIX_PHI_B,
  VERTICAL_SPEED, SWIRL_SPEED, HELIX_HEIGHT,
} from './constants'

interface HelixParticlesProps {
  count: number
  darkMode: boolean
  colorA: string
  colorB: string
  reducedMotion: boolean
}

/**
 * Double-helix particle system using BufferGeometry.
 *
 * Each strand follows a parametric helix:
 *   x(t) = R * cos(omega * t + phi)
 *   y(t) = t * verticalSpeed - height/2
 *   z(t) = R * sin(omega * t + phi)
 *
 * Particles flow upward continuously, wrapping at the top.
 * Size attenuation creates depth, and opacity fades at extremes.
 */
export default function HelixParticles({
  count, darkMode, colorA, colorB, reducedMotion,
}: HelixParticlesProps) {
  const pointsRefA = useRef<THREE.Points>(null)
  const pointsRefB = useRef<THREE.Points>(null)

  // Pre-compute initial particle positions and create geometries
  const { geomA, geomB, offsets } = useMemo(() => {
    const pA = new Float32Array(count * 3)
    const pB = new Float32Array(count * 3)
    const offs = new Float32Array(count)

    for (let i = 0; i < count; i++) {
      const t = (i / count) * HELIX_HEIGHT
      offs[i] = t

      pA[i * 3] = HELIX_RADIUS * Math.cos(HELIX_OMEGA * t + HELIX_PHI_A)
      pA[i * 3 + 1] = t * VERTICAL_SPEED - HELIX_HEIGHT / 2
      pA[i * 3 + 2] = HELIX_RADIUS * Math.sin(HELIX_OMEGA * t + HELIX_PHI_A)

      pB[i * 3] = HELIX_RADIUS * Math.cos(HELIX_OMEGA * t + HELIX_PHI_B)
      pB[i * 3 + 1] = t * VERTICAL_SPEED - HELIX_HEIGHT / 2
      pB[i * 3 + 2] = HELIX_RADIUS * Math.sin(HELIX_OMEGA * t + HELIX_PHI_B)
    }

    const gA = new THREE.BufferGeometry()
    gA.setAttribute('position', new THREE.BufferAttribute(pA, 3))

    const gB = new THREE.BufferGeometry()
    gB.setAttribute('position', new THREE.BufferAttribute(pB, 3))

    return { geomA: gA, geomB: gB, offsets: offs }
  }, [count])

  // Animate particle flow
  useFrame(({ clock }) => {
    if (reducedMotion) return

    const time = clock.getElapsedTime()
    const updateStrand = (ref: React.RefObject<THREE.Points | null>, phi: number) => {
      if (!ref.current) return
      const attr = ref.current.geometry.attributes.position
      if (!attr) return
      const positions = attr.array as Float32Array

      for (let i = 0; i < count; i++) {
        const baseT = offsets[i]
        const t = ((baseT + time * SWIRL_SPEED) % HELIX_HEIGHT)

        positions[i * 3] = HELIX_RADIUS * Math.cos(HELIX_OMEGA * t + phi)
        positions[i * 3 + 1] = t * VERTICAL_SPEED - HELIX_HEIGHT / 2
        positions[i * 3 + 2] = HELIX_RADIUS * Math.sin(HELIX_OMEGA * t + phi)
      }

      attr.needsUpdate = true
    }

    updateStrand(pointsRefA, HELIX_PHI_A)
    updateStrand(pointsRefB, HELIX_PHI_B)
  })

  return (
    <>
      <points ref={pointsRefA} geometry={geomA}>
        <pointsMaterial
          color={colorA}
          size={0.04}
          sizeAttenuation
          transparent
          opacity={0.8}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </points>

      <points ref={pointsRefB} geometry={geomB}>
        <pointsMaterial
          color={colorB}
          size={0.04}
          sizeAttenuation
          transparent
          opacity={0.8}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </points>
    </>
  )
}
