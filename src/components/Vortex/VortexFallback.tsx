'use client'

/**
 * CSS-only 2D fallback for browsers without WebGL.
 *
 * Renders an animated DNA helix shape using CSS transforms and gradients.
 * Targets 30fps via CSS animations with reduced-motion respect.
 */
export default function VortexFallback({ darkMode }: { darkMode: boolean }) {
  const accent = darkMode ? '#22d3ee' : '#0891b2'
  const bg = darkMode ? '#0a0a0a' : '#EAEAEA'
  const textColor = darkMode ? '#e5e5e5' : '#000000'

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        background: bg,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Animated helix SVG */}
      <svg
        viewBox="0 0 200 400"
        style={{
          width: '120px',
          height: '240px',
          opacity: 0.7,
        }}
      >
        <style>
          {`
            @keyframes helix-spin {
              0% { transform: rotateY(0deg); }
              100% { transform: rotateY(360deg); }
            }
            @media (prefers-reduced-motion: reduce) {
              .helix-group { animation: none !important; }
            }
            .helix-group {
              animation: helix-spin 8s linear infinite;
              transform-origin: center;
            }
          `}
        </style>
        <g className="helix-group">
          {/* Strand A */}
          <path
            d="M60,20 Q140,60 60,100 Q-20,140 60,180 Q140,220 60,260 Q-20,300 60,340 Q140,380 60,400"
            fill="none"
            stroke={accent}
            strokeWidth="2"
            opacity="0.8"
          />
          {/* Strand B */}
          <path
            d="M140,20 Q60,60 140,100 Q220,140 140,180 Q60,220 140,260 Q220,300 140,340 Q60,380 140,400"
            fill="none"
            stroke={accent}
            strokeWidth="2"
            opacity="0.5"
          />
          {/* Rungs */}
          {[60, 140, 220, 300].map((y) => (
            <line
              key={y}
              x1="70"
              y1={y}
              x2="130"
              y2={y}
              stroke={accent}
              strokeWidth="1"
              opacity="0.2"
            />
          ))}
        </g>
      </svg>

      {/* Title */}
      <div
        style={{
          marginTop: '24px',
          fontFamily: 'ui-monospace, monospace',
          fontSize: '11px',
          fontWeight: 600,
          letterSpacing: '0.3em',
          color: accent,
          textTransform: 'uppercase',
        }}
      >
        GRIP VORTEX
      </div>
      <div
        style={{
          marginTop: '8px',
          fontFamily: 'ui-monospace, monospace',
          fontSize: '9px',
          letterSpacing: '0.2em',
          color: textColor,
          opacity: 0.5,
        }}
      >
        KNOWLEDGE DOUBLE HELIX
      </div>
    </div>
  )
}
