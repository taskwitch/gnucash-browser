import { formatRational, isNegative, type Rational } from '../lib/gnucash/money.ts'

/** Right-aligned, tabular-numeral amount; muted red when negative. */
export function Amount({
  value,
  fraction = 100,
  className = '',
}: {
  value: Rational
  fraction?: number
  className?: string
}) {
  const classes = ['amount', isNegative(value) ? 'negative' : '', className]
    .filter(Boolean)
    .join(' ')
  return <span className={classes}>{formatRational(value, fraction)}</span>
}
