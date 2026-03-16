'use client'

import { shaderMaterial } from '@react-three/drei'
import { extend } from '@react-three/fiber'
import * as THREE from 'three'

/**
 * Custom holographic shader with Fresnel rim glow and animated scanlines.
 *
 * The material creates a sci-fi holographic look:
 * - Fresnel effect: edges glow brighter than faces (rim lighting)
 * - Scanlines: horizontal bands sweep upward over time
 * - Base colour tinted by the strand/orb colour
 */

const HolographicShaderMaterial = shaderMaterial(
  {
    time: 0,
    color: new THREE.Color('#22d3ee'),
    opacity: 0.85,
    fresnelPower: 2.0,
    scanlineSpeed: 1.5,
    scanlineCount: 40.0,
  },
  // Vertex shader
  `
    varying vec3 vNormal;
    varying vec3 vViewPosition;
    varying vec2 vUv;

    void main() {
      vUv = uv;
      vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
      vViewPosition = -mvPosition.xyz;
      vNormal = normalMatrix * normal;
      gl_Position = projectionMatrix * mvPosition;
    }
  `,
  // Fragment shader
  `
    uniform float time;
    uniform vec3 color;
    uniform float opacity;
    uniform float fresnelPower;
    uniform float scanlineSpeed;
    uniform float scanlineCount;

    varying vec3 vNormal;
    varying vec3 vViewPosition;
    varying vec2 vUv;

    void main() {
      // Fresnel rim effect
      vec3 viewDir = normalize(vViewPosition);
      float fresnel = pow(1.0 - abs(dot(viewDir, normalize(vNormal))), fresnelPower);

      // Animated scanlines
      float scanline = sin((vUv.y + time * scanlineSpeed * 0.1) * scanlineCount * 6.28318) * 0.5 + 0.5;
      scanline = smoothstep(0.3, 0.7, scanline);

      // Combine
      vec3 finalColor = color * (0.4 + fresnel * 0.6);
      float scanlineEffect = mix(0.7, 1.0, scanline * 0.3);
      finalColor *= scanlineEffect;

      // Add rim glow
      finalColor += color * fresnel * 0.3;

      gl_FragColor = vec4(finalColor, opacity * (0.5 + fresnel * 0.5));
    }
  `
)

extend({ HolographicShaderMaterial })

declare module '@react-three/fiber' {
  interface ThreeElements {
    holographicShaderMaterial: React.JSX.IntrinsicElements['shaderMaterial'] & {
      time?: number
      color?: THREE.Color | string
      opacity?: number
      fresnelPower?: number
      scanlineSpeed?: number
      scanlineCount?: number
    }
  }
}

export { HolographicShaderMaterial }
export default HolographicShaderMaterial
