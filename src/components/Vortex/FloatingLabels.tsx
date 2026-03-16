'use client'

import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import {
  HELIX_RADIUS, HELIX_OMEGA, HELIX_PHI_A, HELIX_PHI_B,
  VERTICAL_SPEED, HELIX_HEIGHT, LABEL_POSITIONS, ORB_COLORS,
} from './constants'

interface FloatingLabelsProps {
  darkMode: boolean
  reducedMotion: boolean
}

/**
 * Five concept labels floating alongside the helix at specific positions.
 *
 * Each label is positioned on the helix curve and offset outward from the
 * strand. A glowing sphere marks the attachment point, and the label text
 * uses Html overlay for crisp rendering at any zoom level.
 */
export default function FloatingLabels({ darkMode, reducedMotion }: FloatingLabelsProps) {
  const groupRef = useRef<THREE.Group>(null)
  const orbColors = darkMode ? ORB_COLORS.dark : ORB_COLORS.light

  useFrame(({ clock }) => {
    if (reducedMotion || !groupRef.current) return
    // Labels rotate with the helix
    groupRef.current.rotation.y = clock.getElapsedTime() * 0.05
  })

  return (
    <group ref={groupRef}>
      {LABEL_POSITIONS.map((label) => {
        const t = label.t * HELIX_HEIGHT
        const phi = label.side === 'A' ? HELIX_PHI_A : HELIX_PHI_B

        const x = HELIX_RADIUS * Math.cos(HELIX_OMEGA * t + phi)
        const y = t * VERTICAL_SPEED - HELIX_HEIGHT / 2
        const z = HELIX_RADIUS * Math.sin(HELIX_OMEGA * t + phi)

        // Offset outward from helix centre
        const offsetDir = new THREE.Vector3(x, 0, z).normalize()
        const labelPos = new THREE.Vector3(
          x + offsetDir.x * 1.2,
          y,
          z + offsetDir.z * 1.2,
        )

        const color = orbColors[label.name as keyof typeof orbColors]

        return (
          <group key={label.name} position={[labelPos.x, labelPos.y, labelPos.z]}>
            {/* Glowing orb */}
            <mesh>
              <sphereGeometry args={[0.08, 16, 16]} />
              <meshStandardMaterial
                color={color}
                emissive={color}
                emissiveIntensity={0.8}
                transparent
                opacity={0.9}
              />
            </mesh>

            {/* Outer glow */}
            <mesh>
              <sphereGeometry args={[0.14, 16, 16]} />
              <meshStandardMaterial
                color={color}
                transparent
                opacity={0.15}
              />
            </mesh>

            {/* Text label */}
            <Html
              center
              distanceFactor={8}
              style={{
                pointerEvents: 'none',
                userSelect: 'none',
              }}
            >
              <div
                style={{
                  fontFamily: 'ui-monospace, monospace',
                  fontSize: '10px',
                  fontWeight: 600,
                  letterSpacing: '0.15em',
                  color: color,
                  textShadow: `0 0 8px ${color}`,
                  whiteSpace: 'nowrap',
                  transform: 'translateY(-24px)',
                }}
              >
                {label.name}
              </div>
            </Html>
          </group>
        )
      })}
    </group>
  )
}
