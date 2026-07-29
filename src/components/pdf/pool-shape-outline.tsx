import type { ReactNode } from 'react'

// Simple shape outline used on printed documents (order signature-page sketch,
// production sheet shape icon) — NOT the configurator's shape picker and NOT
// the detailed technical PoolSchematic drawing. Deliberately minimal: just an
// outline matching the pool's shape, sized to fit the given box.
//
// 'oval' is not a real configurator pool_shape value (customers only ever pick
// circle / rectangle_rounded / rectangle_sharp) — it exists only as a manual
// override for custom/hand-entered orders, see Order.diagram_shape.

export const DIAGRAM_SHAPE_LABELS: Record<string, string> = {
  circle: 'Kruh',
  rectangle_sharp: 'Obdélník, ostrý roh',
  rectangle_rounded: 'Obdélník, oblý roh',
  oval: 'Ovál',
}

interface PoolShapeOutlineProps {
  shape: string | null | undefined
  width: number
  height: number
  strokeColor?: string
  strokeWidth?: number
}

export function PoolShapeOutline({
  shape,
  width,
  height,
  strokeColor = '#01384B',
  strokeWidth = 2,
}: PoolShapeOutlineProps) {
  const pad = strokeWidth * 2
  const innerW = width - pad * 2
  const innerH = height - pad * 2

  let shapeEl: ReactNode

  if (shape === 'circle') {
    const r = Math.min(innerW, innerH) / 2
    shapeEl = (
      <circle
        cx={width / 2}
        cy={height / 2}
        r={r}
        fill="none"
        stroke={strokeColor}
        strokeWidth={strokeWidth}
      />
    )
  } else if (shape === 'oval') {
    // Width:height ratio 3:1, capped to fit the available box
    const rxMax = innerW / 2
    const ryMax = innerH / 2
    const rx = Math.min(rxMax, ryMax * 3)
    const ry = rx / 3
    shapeEl = (
      <ellipse
        cx={width / 2}
        cy={height / 2}
        rx={rx}
        ry={ry}
        fill="none"
        stroke={strokeColor}
        strokeWidth={strokeWidth}
      />
    )
  } else {
    // rectangle_sharp (default fallback for unknown values goes to rounded, see below)
    const isSharp = shape === 'rectangle_sharp'
    shapeEl = (
      <rect
        x={pad}
        y={pad}
        width={innerW}
        height={innerH}
        rx={isSharp ? 0 : 16}
        ry={isSharp ? 0 : 16}
        fill="none"
        stroke={strokeColor}
        strokeWidth={strokeWidth}
      />
    )
  }

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      {shapeEl}
    </svg>
  )
}
