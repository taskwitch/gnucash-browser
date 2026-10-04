export interface SeriesDef {
  name: string
  /** CSS color */
  color: string
}

export interface GroupedBarDatum {
  label: string
  values: number[]
}

const WIDTH = 640
const HEIGHT = 240
const PAD_LEFT = 64
const PAD_RIGHT = 8
const PAD_TOP = 12
const PAD_BOTTOM = 28

export function niceCeil(value: number): number {
  if (value <= 0) return 1
  const magnitude = 10 ** Math.floor(Math.log10(value))
  const normalized = value / magnitude
  const nice = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10
  return nice * magnitude
}

export function formatTick(value: number): string {
  if (value >= 10000) {
    return new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(
      value,
    )
  }
  return new Intl.NumberFormat('en', { maximumFractionDigits: 0 }).format(value)
}

/**
 * Grouped bar chart, hand-rolled SVG. No animation, no tooltips — the
 * companion data table below the chart carries exact values and serves as
 * the accessible fallback.
 */
export function BarChart({
  title,
  series,
  data,
}: {
  title: string
  series: [SeriesDef, SeriesDef]
  data: GroupedBarDatum[]
}) {
  const plotW = WIDTH - PAD_LEFT - PAD_RIGHT
  const plotH = HEIGHT - PAD_TOP - PAD_BOTTOM
  const max = niceCeil(Math.max(1, ...data.flatMap((d) => d.values)))
  const ticks = [0, 1, 2, 3, 4].map((i) => (max * i) / 4)
  const groupW = plotW / Math.max(1, data.length)
  const barW = Math.max(2, (groupW * 0.7) / series.length - 2)

  const y = (v: number) => PAD_TOP + plotH - (v / max) * plotH

  return (
    <figure className="chart">
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label={title}>
        <title>{title}</title>
        {ticks.map((t) => (
          <g key={t}>
            <line
              x1={PAD_LEFT}
              x2={WIDTH - PAD_RIGHT}
              y1={y(t)}
              y2={y(t)}
              className={t === 0 ? 'chart-axis' : 'chart-grid'}
            />
            <text x={PAD_LEFT - 6} y={y(t) + 4} textAnchor="end" className="chart-tick">
              {formatTick(t)}
            </text>
          </g>
        ))}
        {data.map((d, i) => {
          const groupX = PAD_LEFT + i * groupW + (groupW - series.length * (barW + 2)) / 2
          return (
            <g key={d.label}>
              {series.map((s, si) => {
                const v = d.values[si] ?? 0
                const top = y(Math.max(0, v))
                return (
                  <rect
                    key={s.name}
                    x={groupX + si * (barW + 2)}
                    y={top}
                    width={barW}
                    height={Math.max(0, y(0) - top)}
                    fill={s.color}
                    shapeRendering="crispEdges"
                  />
                )
              })}
              <text x={PAD_LEFT + i * groupW + groupW / 2} y={HEIGHT - 10} textAnchor="middle" className="chart-tick">
                {d.label}
              </text>
            </g>
          )
        })}
      </svg>
      <figcaption className="chart-legend">
        {series.map((s) => (
          <span key={s.name} className="legend-item">
            <span className="legend-swatch" style={{ background: s.color }} />
            {s.name}
          </span>
        ))}
      </figcaption>
    </figure>
  )
}
