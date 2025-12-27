/**
 * Pool Schematic Component
 * Generates a technical drawing/schematic of the pool for production documents
 */

interface PoolSchematicProps {
  // Pool shape
  shape: 'circle' | 'rectangle_rounded' | 'rectangle_sharp' | string | null
  // Pool type
  type: 'skimmer' | 'overflow' | string | null
  // Dimensions string like "6×3m" or "6m" for circle
  dimensions: string | null
  // Depth string like "1.2m"
  depth: string | null
  // Color
  color: 'blue' | 'white' | 'gray' | 'combination' | string | null
  // Stairs type
  stairs?: string | null
  // Has lighting
  hasLighting?: boolean
  // Has counterflow
  hasCounterflow?: boolean
  // Scale for different contexts (print vs screen)
  scale?: number
}

const COLOR_MAP: Record<string, string> = {
  blue: '#7BC4C1',
  white: '#E8F4F8',
  gray: '#B0BEC5',
  combination: 'url(#combinationGradient)',
}

const STAIRS_LABELS: Record<string, string> = {
  roman: 'Románské schody',
  corner_triangle: 'Rohové trojúhel.',
  full_width: 'Přes celou šířku',
  with_bench: 'S lavičkou',
  corner_square: 'Rohové pravoúhlé',
}

export function PoolSchematic({
  shape,
  type,
  dimensions,
  depth,
  color,
  stairs,
  hasLighting = false,
  hasCounterflow = false,
  scale = 1,
}: PoolSchematicProps) {
  // Parse dimensions
  const parsedDimensions = parseDimensions(dimensions)
  const poolColor = color ? COLOR_MAP[color] || COLOR_MAP.blue : COLOR_MAP.blue

  // SVG viewBox and pool dimensions based on shape
  const isCircle = shape === 'circle'
  const isRounded = shape === 'rectangle_rounded'

  // Base dimensions for SVG (will scale pool inside)
  const svgWidth = 400 * scale
  const svgHeight = 300 * scale

  // Pool drawing area (with margins for labels)
  const margin = 50 * scale
  const poolAreaWidth = svgWidth - margin * 2
  const poolAreaHeight = svgHeight - margin * 2

  // Calculate pool dimensions in SVG units
  let poolWidth: number, poolHeight: number, poolX: number, poolY: number

  if (isCircle) {
    const diameter = Math.min(poolAreaWidth, poolAreaHeight) * 0.8
    poolWidth = diameter
    poolHeight = diameter
    poolX = (svgWidth - diameter) / 2
    poolY = (svgHeight - diameter) / 2
  } else {
    // Rectangle - maintain aspect ratio from dimensions
    const aspectRatio = parsedDimensions.length / parsedDimensions.width
    if (aspectRatio > poolAreaWidth / poolAreaHeight) {
      poolWidth = poolAreaWidth * 0.85
      poolHeight = poolWidth / aspectRatio
    } else {
      poolHeight = poolAreaHeight * 0.85
      poolWidth = poolHeight * aspectRatio
    }
    poolX = (svgWidth - poolWidth) / 2
    poolY = (svgHeight - poolHeight) / 2
  }

  const cornerRadius = isRounded ? 20 * scale : 4 * scale
  const strokeWidth = 2 * scale
  const fontSize = 12 * scale
  const labelFontSize = 10 * scale

  return (
    <svg
      width={svgWidth}
      height={svgHeight}
      viewBox={`0 0 ${svgWidth} ${svgHeight}`}
      style={{ background: 'white' }}
    >
      <defs>
        {/* Gradient for combination color */}
        <linearGradient id="combinationGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#7BC4C1" />
          <stop offset="50%" stopColor="#E8F4F8" />
          <stop offset="100%" stopColor="#B0BEC5" />
        </linearGradient>

        {/* Water pattern */}
        <pattern id="waterPattern" x="0" y="0" width="20" height="10" patternUnits="userSpaceOnUse">
          <path
            d="M0 5 Q5 2 10 5 T20 5"
            fill="none"
            stroke="#48A9A6"
            strokeWidth="0.5"
            opacity="0.3"
          />
        </pattern>

        {/* Arrow marker */}
        <marker
          id="arrowhead"
          markerWidth="6"
          markerHeight="6"
          refX="3"
          refY="3"
          orient="auto"
        >
          <path d="M0,0 L6,3 L0,6 Z" fill="#01384B" />
        </marker>
      </defs>

      {/* Pool shape */}
      {isCircle ? (
        <circle
          cx={poolX + poolWidth / 2}
          cy={poolY + poolHeight / 2}
          r={poolWidth / 2}
          fill={poolColor}
          stroke="#01384B"
          strokeWidth={strokeWidth}
        />
      ) : (
        <rect
          x={poolX}
          y={poolY}
          width={poolWidth}
          height={poolHeight}
          rx={cornerRadius}
          ry={cornerRadius}
          fill={poolColor}
          stroke="#01384B"
          strokeWidth={strokeWidth}
        />
      )}

      {/* Water pattern overlay */}
      {isCircle ? (
        <circle
          cx={poolX + poolWidth / 2}
          cy={poolY + poolHeight / 2}
          r={poolWidth / 2 - strokeWidth}
          fill="url(#waterPattern)"
        />
      ) : (
        <rect
          x={poolX + strokeWidth}
          y={poolY + strokeWidth}
          width={poolWidth - strokeWidth * 2}
          height={poolHeight - strokeWidth * 2}
          rx={cornerRadius - strokeWidth}
          ry={cornerRadius - strokeWidth}
          fill="url(#waterPattern)"
        />
      )}

      {/* Stairs indicator (for rectangles) */}
      {!isCircle && stairs && stairs !== 'none' && (
        <g>
          {/* Stairs area - bottom left corner for roman, varies for others */}
          {stairs === 'roman' && (
            <>
              <path
                d={`M${poolX + cornerRadius},${poolY + poolHeight}
                    L${poolX + cornerRadius},${poolY + poolHeight - poolHeight * 0.25}
                    Q${poolX + poolWidth * 0.15},${poolY + poolHeight - poolHeight * 0.25} ${poolX + poolWidth * 0.2},${poolY + poolHeight - poolHeight * 0.15}
                    Q${poolX + poolWidth * 0.25},${poolY + poolHeight} ${poolX + poolWidth * 0.3},${poolY + poolHeight}`}
                fill="#E8F4F8"
                stroke="#01384B"
                strokeWidth={strokeWidth * 0.75}
              />
              {/* Stair steps lines */}
              <line
                x1={poolX + cornerRadius + 5}
                y1={poolY + poolHeight - poolHeight * 0.06}
                x2={poolX + poolWidth * 0.25}
                y2={poolY + poolHeight - poolHeight * 0.06}
                stroke="#01384B"
                strokeWidth={strokeWidth * 0.5}
              />
              <line
                x1={poolX + cornerRadius + 10}
                y1={poolY + poolHeight - poolHeight * 0.12}
                x2={poolX + poolWidth * 0.2}
                y2={poolY + poolHeight - poolHeight * 0.12}
                stroke="#01384B"
                strokeWidth={strokeWidth * 0.5}
              />
              <line
                x1={poolX + cornerRadius + 15}
                y1={poolY + poolHeight - poolHeight * 0.18}
                x2={poolX + poolWidth * 0.15}
                y2={poolY + poolHeight - poolHeight * 0.18}
                stroke="#01384B"
                strokeWidth={strokeWidth * 0.5}
              />
            </>
          )}
          {stairs === 'full_width' && (
            <>
              {/* Full width stairs at one end */}
              <rect
                x={poolX}
                y={poolY + poolHeight - poolHeight * 0.2}
                width={poolWidth}
                height={poolHeight * 0.2}
                rx={cornerRadius}
                fill="#E8F4F8"
                stroke="#01384B"
                strokeWidth={strokeWidth * 0.75}
              />
              {/* Step lines */}
              <line
                x1={poolX + 10}
                y1={poolY + poolHeight - poolHeight * 0.07}
                x2={poolX + poolWidth - 10}
                y2={poolY + poolHeight - poolHeight * 0.07}
                stroke="#01384B"
                strokeWidth={strokeWidth * 0.5}
              />
              <line
                x1={poolX + 10}
                y1={poolY + poolHeight - poolHeight * 0.14}
                x2={poolX + poolWidth - 10}
                y2={poolY + poolHeight - poolHeight * 0.14}
                stroke="#01384B"
                strokeWidth={strokeWidth * 0.5}
              />
            </>
          )}
          {(stairs === 'corner_triangle' || stairs === 'corner_square') && (
            <>
              {/* Corner stairs */}
              <path
                d={`M${poolX},${poolY + poolHeight - poolHeight * 0.25}
                    L${poolX + poolWidth * 0.2},${poolY + poolHeight - poolHeight * 0.25}
                    L${poolX + poolWidth * 0.2},${poolY + poolHeight}
                    L${poolX + cornerRadius},${poolY + poolHeight}
                    Q${poolX},${poolY + poolHeight} ${poolX},${poolY + poolHeight - cornerRadius}
                    Z`}
                fill="#E8F4F8"
                stroke="#01384B"
                strokeWidth={strokeWidth * 0.75}
              />
            </>
          )}

          {/* Stairs label */}
          <text
            x={poolX + poolWidth * 0.15}
            y={poolY + poolHeight + 15 * scale}
            fontSize={labelFontSize}
            fill="#666"
            textAnchor="middle"
          >
            {STAIRS_LABELS[stairs] || stairs}
          </text>
        </g>
      )}

      {/* Skimmer indicator */}
      {type === 'skimmer' && (
        <g>
          <rect
            x={isCircle ? poolX + poolWidth - 15 * scale : poolX + poolWidth - 20 * scale}
            y={isCircle ? poolY + poolHeight / 2 - 10 * scale : poolY + 20 * scale}
            width={12 * scale}
            height={20 * scale}
            fill="#01384B"
            rx={2 * scale}
          />
          <text
            x={isCircle ? poolX + poolWidth + 5 * scale : poolX + poolWidth + 5 * scale}
            y={isCircle ? poolY + poolHeight / 2 + 3 * scale : poolY + 35 * scale}
            fontSize={labelFontSize}
            fill="#01384B"
            fontWeight="bold"
          >
            SK
          </text>
        </g>
      )}

      {/* Overflow edge indicator */}
      {type === 'overflow' && (
        <g>
          {isCircle ? (
            <circle
              cx={poolX + poolWidth / 2}
              cy={poolY + poolHeight / 2}
              r={poolWidth / 2 + 5 * scale}
              fill="none"
              stroke="#01384B"
              strokeWidth={strokeWidth * 2}
              strokeDasharray={`${5 * scale} ${3 * scale}`}
            />
          ) : (
            <rect
              x={poolX - 5 * scale}
              y={poolY - 5 * scale}
              width={poolWidth + 10 * scale}
              height={poolHeight + 10 * scale}
              rx={cornerRadius + 5 * scale}
              fill="none"
              stroke="#01384B"
              strokeWidth={strokeWidth * 2}
              strokeDasharray={`${5 * scale} ${3 * scale}`}
            />
          )}
          <text
            x={poolX + poolWidth + 15 * scale}
            y={poolY + 15 * scale}
            fontSize={labelFontSize}
            fill="#01384B"
            fontWeight="bold"
          >
            PŘELIV
          </text>
        </g>
      )}

      {/* Return jet (tryska) */}
      <g>
        <circle
          cx={isCircle ? poolX + 20 * scale : poolX + 15 * scale}
          cy={poolY + poolHeight / 2}
          r={6 * scale}
          fill="#fff"
          stroke="#01384B"
          strokeWidth={strokeWidth * 0.75}
        />
        <text
          x={isCircle ? poolX - 5 * scale : poolX - 10 * scale}
          y={poolY + poolHeight / 2 + 3 * scale}
          fontSize={labelFontSize}
          fill="#01384B"
          textAnchor="end"
        >
          T
        </text>
      </g>

      {/* Lighting indicator */}
      {hasLighting && (
        <g>
          <circle
            cx={poolX + poolWidth / 2}
            cy={isCircle ? poolY + 20 * scale : poolY + poolHeight - 20 * scale}
            r={8 * scale}
            fill="#FFD700"
            stroke="#01384B"
            strokeWidth={strokeWidth * 0.5}
          />
          <text
            x={poolX + poolWidth / 2}
            y={isCircle ? poolY + 20 * scale + 3 * scale : poolY + poolHeight - 17 * scale}
            fontSize={labelFontSize * 0.8}
            fill="#01384B"
            textAnchor="middle"
            fontWeight="bold"
          >
            💡
          </text>
          <text
            x={poolX + poolWidth / 2 + 15 * scale}
            y={isCircle ? poolY + 23 * scale : poolY + poolHeight - 17 * scale}
            fontSize={labelFontSize}
            fill="#01384B"
          >
            SVĚTLO
          </text>
        </g>
      )}

      {/* Counterflow indicator */}
      {hasCounterflow && (
        <g>
          <rect
            x={poolX + poolWidth - 25 * scale}
            y={poolY + poolHeight / 2 - 8 * scale}
            width={16 * scale}
            height={16 * scale}
            fill="#48A9A6"
            stroke="#01384B"
            strokeWidth={strokeWidth * 0.5}
            rx={3 * scale}
          />
          <text
            x={poolX + poolWidth - 17 * scale}
            y={poolY + poolHeight / 2 + 3 * scale}
            fontSize={labelFontSize * 0.9}
            fill="white"
            textAnchor="middle"
            fontWeight="bold"
          >
            PP
          </text>
          <text
            x={poolX + poolWidth + 5 * scale}
            y={poolY + poolHeight / 2 + 3 * scale}
            fontSize={labelFontSize}
            fill="#01384B"
          >
            PROTIPROUD
          </text>
        </g>
      )}

      {/* Dimension lines - Width */}
      <g>
        <line
          x1={poolX}
          y1={poolY - 20 * scale}
          x2={poolX + poolWidth}
          y2={poolY - 20 * scale}
          stroke="#01384B"
          strokeWidth={strokeWidth * 0.5}
          markerEnd="url(#arrowhead)"
          markerStart="url(#arrowhead)"
        />
        <text
          x={poolX + poolWidth / 2}
          y={poolY - 25 * scale}
          fontSize={fontSize}
          fill="#01384B"
          textAnchor="middle"
          fontWeight="bold"
        >
          {isCircle ? `Ø ${parsedDimensions.diameter || dimensions}` : `${parsedDimensions.length}m`}
        </text>
      </g>

      {/* Dimension lines - Height (for rectangles) */}
      {!isCircle && (
        <g>
          <line
            x1={poolX - 20 * scale}
            y1={poolY}
            x2={poolX - 20 * scale}
            y2={poolY + poolHeight}
            stroke="#01384B"
            strokeWidth={strokeWidth * 0.5}
            markerEnd="url(#arrowhead)"
            markerStart="url(#arrowhead)"
          />
          <text
            x={poolX - 25 * scale}
            y={poolY + poolHeight / 2}
            fontSize={fontSize}
            fill="#01384B"
            textAnchor="middle"
            fontWeight="bold"
            transform={`rotate(-90, ${poolX - 25 * scale}, ${poolY + poolHeight / 2})`}
          >
            {parsedDimensions.width}m
          </text>
        </g>
      )}

      {/* Depth indicator */}
      {depth && (
        <g>
          <rect
            x={poolX + poolWidth / 2 - 25 * scale}
            y={poolY + poolHeight / 2 - 12 * scale}
            width={50 * scale}
            height={24 * scale}
            fill="rgba(255,255,255,0.9)"
            stroke="#01384B"
            strokeWidth={strokeWidth * 0.5}
            rx={4 * scale}
          />
          <text
            x={poolX + poolWidth / 2}
            y={poolY + poolHeight / 2 - 2 * scale}
            fontSize={labelFontSize}
            fill="#666"
            textAnchor="middle"
          >
            hloubka
          </text>
          <text
            x={poolX + poolWidth / 2}
            y={poolY + poolHeight / 2 + 10 * scale}
            fontSize={fontSize}
            fill="#01384B"
            textAnchor="middle"
            fontWeight="bold"
          >
            {depth}
          </text>
        </g>
      )}

      {/* Legend */}
      <g transform={`translate(${10 * scale}, ${svgHeight - 25 * scale})`}>
        <text fontSize={labelFontSize * 0.9} fill="#666">
          SK = Skimmer | T = Tryska | PP = Protiproud
        </text>
      </g>
    </svg>
  )
}

/**
 * Parse dimensions string like "6×3m" or "6m" into structured object
 */
function parseDimensions(dimensions: string | null): {
  length: number
  width: number
  diameter?: number
} {
  if (!dimensions) {
    return { length: 6, width: 3 }
  }

  // Handle circle (single dimension)
  const circleMatch = dimensions.match(/^(\d+(?:\.\d+)?)\s*m?$/)
  if (circleMatch) {
    const diameter = parseFloat(circleMatch[1])
    return { length: diameter, width: diameter, diameter }
  }

  // Handle rectangle (two dimensions like "6×3m" or "6 x 3 m")
  const rectMatch = dimensions.match(/(\d+(?:\.\d+)?)\s*[×x]\s*(\d+(?:\.\d+)?)\s*m?/)
  if (rectMatch) {
    return {
      length: parseFloat(rectMatch[1]),
      width: parseFloat(rectMatch[2]),
    }
  }

  // Fallback
  return { length: 6, width: 3 }
}
