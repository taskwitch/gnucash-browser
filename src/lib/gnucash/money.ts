/**
 * Exact rational arithmetic for monetary values.
 *
 * GnuCash stores amounts as fractions ("12345/100", and denominators other
 * than 100 do occur, e.g. from currency exchange). All sums are computed as
 * Rationals and only converted to Number at display edges, so balances match
 * desktop GnuCash to the cent instead of accumulating float error.
 */

export interface Rational {
  /** Normalized: den > 0 and gcd(|num|, den) = 1. */
  num: bigint
  den: bigint
}

export const ZERO: Rational = { num: 0n, den: 1n }

function gcd(a: bigint, b: bigint): bigint {
  let x = a < 0n ? -a : a
  let y = b < 0n ? -b : b
  while (y !== 0n) {
    const t = x % y
    x = y
    y = t
  }
  return x === 0n ? 1n : x
}

export function makeRational(num: bigint, den: bigint): Rational {
  if (den === 0n) throw new Error('Rational with zero denominator')
  let n = num
  let d = den
  if (d < 0n) {
    n = -n
    d = -d
  }
  const g = gcd(n, d)
  return { num: n / g, den: d / g }
}

/** Parses GnuCash fraction strings like "-12345/100" or plain integers. */
export function parseFraction(text: string): Rational {
  const t = text.trim()
  const slash = t.indexOf('/')
  if (slash === -1) return makeRational(BigInt(t), 1n)
  return makeRational(BigInt(t.slice(0, slash)), BigInt(t.slice(slash + 1)))
}

export function add(a: Rational, b: Rational): Rational {
  return makeRational(a.num * b.den + b.num * a.den, a.den * b.den)
}

export function neg(a: Rational): Rational {
  return { num: -a.num, den: a.den }
}

export function isZero(a: Rational): boolean {
  return a.num === 0n
}

export function isNegative(a: Rational): boolean {
  return a.num < 0n
}

export function abs(a: Rational): Rational {
  return a.num < 0n ? neg(a) : a
}

/** Display-only conversion; never use for accumulation. */
export function toNumber(a: Rational): number {
  return Number(a.num) / Number(a.den)
}

/** Number of decimal places implied by a commodity fraction (100 → 2). */
function decimalsForFraction(fraction: number): number {
  let d = 0
  let f = fraction
  while (f > 1 && f % 10 === 0) {
    d += 1
    f /= 10
  }
  return d
}

function groupThousands(s: string): string {
  return s.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

/**
 * Formats exactly, rounding half away from zero at the commodity's fraction.
 * No floating point involved, so 3167.665 never renders as 3167.64.
 */
export function formatRational(a: Rational, fraction = 100): string {
  const d = decimalsForFraction(fraction)
  if (d === 0) {
    return groupThousands(roundToScale(a, 1n).toString())
  }
  const scale = 10n ** BigInt(d)
  const scaled = roundToScale(a, scale)
  const intPart = scaled / scale
  const fracPart = (scaled < 0n ? -scaled : scaled) % scale
  const sign = scaled < 0n ? '-' : ''
  return `${sign}${groupThousands((intPart < 0n ? -intPart : intPart).toString())}.${fracPart
    .toString()
    .padStart(d, '0')}`
}

/** value * scale, rounded half away from zero. */
function roundToScale(a: Rational, scale: bigint): bigint {
  const negative = a.num < 0n
  const absNum = negative ? -a.num : a.num
  const rounded = (absNum * scale + a.den / 2n) / a.den
  return negative ? -rounded : rounded
}
