import { formatTick, niceCeil } from './BarChart.tsx'

const WIDTH = 640
const HEIGHT = 220
const PAD_LEFT = 64
const PAD_RIGHT = 56
const PAD_TOP = 12
const PAD_BOTTOM = 28

/**
 * Net-worth-over-time line chart. Single series: no legend (the title names
 * it); the final value is direct-labeled like a statement balance.
 */
export function LineChart({
  title,
  color,
  data,
  formatValue,
}: {
  title: string
  color: string
  data: { label: string; value: number }[]
  formatValue: (v: number) => string
}) {
  if (data.length < 2) {
    return (
      <figure className="chart">
        <figcaption className="chart-empty">{title}: not enough data yet.</figcaption>
      </figure>
    )
  }

  const plotW = WIDTH - PAD_LEFT - PAD_RIGHT
  const plotH = HEIGHT - PAD_TOP - PAD_BOTTOM
  const values = data.map((d) => d.value)
  const lo = Math.min(0, ...values)
  const hi = niceCeil(Math.max(1, ...values))
  const span = hi - lo || 1

  const x = (i: number) => PAD_LEFT + (i / (data.length - 1)) * plotW
  const y = (v: number) => PAD_TOP + plotH - ((v - lo) / span) * plotH

  const ticks = [0, 1, 2, 3, 4].map((i) => lo + (span * i) / 4)
  const points = data.map((d, i) => `${x(i)},${y(d.value)}`).join(' ')
  const area = `${PAD_LEFT},${y(lo)} ${points} ${x(data.length - 1)},${y(lo)}`
  const last = data[data.length - 1]!
  // Avoid x-label collisions on narrow plots: first, middle, last.
  const labelIndexes = new Set(
    data.length <= 6
      ? data.map((_, i) => i)
      : [0, Math.floor((data.length - 1) / 2), data.length - 1],
  )

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
        <polygon points={area} fill={color} opacity={0.08} />
        <polyline points={points} fill="none" stroke={color} strokeWidth={2} />
        {data.map((d, i) =>
          labelIndexes.has(i) ? (
            <text
              key={d.label}
              x={x(i)}
              y={HEIGHT - 10}
              textAnchor={i === 0 ? 'start' : i === data.length - 1 ? 'end' : 'middle'}
              className="chart-tick"
            >
              {d.label}
            </text>
          ) : null,
        )}
        <text x={WIDTH - PAD_RIGHT + 6} y={y(last.value) + 4} className="chart-value-label">
          {formatValue(last.value)}
        </text>
      </svg>
    </figure>
  )
}
