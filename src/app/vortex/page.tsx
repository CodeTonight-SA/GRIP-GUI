'use client'

import VortexScene from '@/components/Vortex'

/**
 * Standalone immersive /vortex route.
 *
 * Full-viewport Vortex visualisation with auto-rotate and concept labels.
 * Navigate here via the command palette ("vortex") or the Konami code.
 */
export default function VortexPage() {
  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden' }}>
      <VortexScene autoRotate showLabels />

      {/* Overlay title */}
      <div
        style={{
          position: 'absolute',
          bottom: '40px',
          left: '50%',
          transform: 'translateX(-50%)',
          textAlign: 'center',
          pointerEvents: 'none',
          zIndex: 10,
        }}
      >
        <div
          style={{
            fontFamily: 'ui-monospace, monospace',
            fontSize: '14px',
            fontWeight: 700,
            letterSpacing: '0.4em',
            color: 'var(--primary)',
            textShadow: '0 0 20px var(--primary)',
          }}
        >
          GRIP VORTEX
        </div>
        <div
          style={{
            fontFamily: 'ui-monospace, monospace',
            fontSize: '9px',
            letterSpacing: '0.25em',
            color: 'var(--muted-foreground)',
            marginTop: '8px',
          }}
        >
          KNOWLEDGE DOUBLE HELIX
        </div>
      </div>
    </div>
  )
}
