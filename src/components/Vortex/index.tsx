'use client'

import dynamic from 'next/dynamic'

/**
 * Dynamic import wrapper for the Vortex 3D scene.
 *
 * Three.js and R3F must be loaded client-side only (no SSR) because
 * they depend on the DOM and WebGL context. Dynamic import with
 * ssr: false ensures the bundle is only loaded in the browser.
 */
const VortexScene = dynamic(() => import('./VortexScene'), {
  ssr: false,
  loading: () => (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'ui-monospace, monospace',
        fontSize: '11px',
        letterSpacing: '0.3em',
        opacity: 0.4,
      }}
    >
      LOADING VORTEX
    </div>
  ),
})

export default VortexScene
export { VortexScene }
export type { default as VortexSceneProps } from './VortexScene'
