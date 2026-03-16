'use client'

import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import {
  HELIX_RADIUS, HELIX_OMEGA, HELIX_PHI_A, HELIX_PHI_B,
  VERTICAL_SPEED, SWIRL_SPEED, HELIX_HEIGHT, RUNG_INTERVAL,
} from './constants'

interface HelixStrandsProps {
  darkMode: boolean
  colorA: string
  colorB: string
  rungColor: string
  rungOpacity: number
  reducedMotion: boolean
}

/**
 * CatmullRomCurve3 tube backbones for the double-helix strands,
 * plus connecting rungs every RUNG_INTERVAL steps.
 *
 * The strands provide the visible "rail" structure, while the particles
 * flow along them. Rungs bridge the two strands like DNA base pairs.
 */
export default function HelixStrands({
  darkMode, colorA, colorB, rungColor, rungOpacity, reducedMotion,
}: HelixStrandsProps) {
  const groupRef = useRef<THREE.Group>(null)

  const segments = 200
  const tubeRadius = 0.015

  // Generate helix curve points
  const { curveA, curveB, rungPairs } = useMemo(() => {
    const pointsA: THREE.Vector3[] = []
    const pointsB: THREE.Vector3[] = []
    const rungs: Array<[THREE.Vector3, THREE.Vector3]> = []

    for (let i = 0; i <= segments; i++) {
      const t = (i / segments) * HELIX_HEIGHT

      const pA = new THREE.Vector3(
        HELIX_RADIUS * Math.cos(HELIX_OMEGA * t + HELIX_PHI_A),
        t * VERTICAL_SPEED - HELIX_HEIGHT / 2,
        HELIX_RADIUS * Math.sin(HELIX_OMEGA * t + HELIX_PHI_A),
      )
      const pB = new THREE.Vector3(
        HELIX_RADIUS * Math.cos(HELIX_OMEGA * t + HELIX_PHI_B),
        t * VERTICAL_SPEED - HELIX_HEIGHT / 2,
        HELIX_RADIUS * Math.sin(HELIX_OMEGA * t + HELIX_PHI_B),
      )

      pointsA.push(pA)
      pointsB.push(pB)

      // Connecting rungs every Nth step
      if (i % (segments / (HELIX_HEIGHT / RUNG_INTERVAL * 2)) < 1 && i > 0 && i < segments) {
        rungs.push([pA.clone(), pB.clone()])
      }
    }

    return {
      curveA: new THREE.CatmullRomCurve3(pointsA),
      curveB: new THREE.CatmullRomCurve3(pointsB),
      rungPairs: rungs,
    }
  }, [])

  // Gentle rotation
  useFrame(({ clock }) => {
    if (reducedMotion || !groupRef.current) return
    groupRef.current.rotation.y = clock.getElapsedTime() * 0.05
  })

  return (
    <group ref={groupRef}>
      {/* Strand A backbone */}
      <mesh>
        <tubeGeometry args={[curveA, segments, tubeRadius, 8, false]} />
        <meshStandardMaterial
          color={colorA}
          emissive={colorA}
          emissiveIntensity={0.3}
          transparent
          opacity={0.6}
        />
      </mesh>

      {/* Strand B backbone */}
      <mesh>
        <tubeGeometry args={[curveB, segments, tubeRadius, 8, false]} />
        <meshStandardMaterial
          color={colorB}
          emissive={colorB}
          emissiveIntensity={0.3}
          transparent
          opacity={0.6}
        />
      </mesh>

      {/* Connecting rungs */}
      {rungPairs.map((pair, i) => {
        const midpoint = new THREE.Vector3().addVectors(pair[0], pair[1]).multiplyScalar(0.5)
        const direction = new THREE.Vector3().subVectors(pair[1], pair[0])
        const length = direction.length()

        return (
          <mesh key={i} position={midpoint}>
            <cylinderGeometry args={[0.005, 0.005, length, 4]} />
            <meshStandardMaterial
              color={rungColor}
              transparent
              opacity={rungOpacity}
              emissive={rungColor}
              emissiveIntensity={0.1}
            />
          </mesh>
        )
      })}
    </group>
  )
}
