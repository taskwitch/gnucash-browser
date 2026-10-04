import { describe, expect, it } from 'vitest'
import {
  add,
  formatRational,
  isNegative,
  makeRational,
  neg,
  parseFraction,
  toNumber,
} from './money.ts'

describe('parseFraction', () => {
  it('parses plain fractions', () => {
    expect(parseFraction('12345/100')).toEqual({ num: 2469n, den: 20n })
  })

  it('parses negative fractions', () => {
    const r = parseFraction('-5234/100')
    expect(isNegative(r)).toBe(true)
    expect(r).toEqual({ num: -2617n, den: 50n })
  })

  it('parses plain integers', () => {
    expect(parseFraction('42')).toEqual({ num: 42n, den: 1n })
  })

  it('keeps non-100 denominators exact', () => {
    expect(parseFraction('130000/1000')).toEqual({ num: 130n, den: 1n })
    expect(parseFraction('1/3')).toEqual({ num: 1n, den: 3n })
  })
})

describe('makeRational', () => {
  it('normalizes sign to the numerator', () => {
    expect(makeRational(1n, -2n)).toEqual({ num: -1n, den: 2n })
  })

  it('throws on zero denominator', () => {
    expect(() => makeRational(1n, 0n)).toThrow()
  })
})

describe('add', () => {
  it('adds across denominators exactly', () => {
    // 1/3 + 1/6 = 1/2 — the case floats botch
    expect(add(parseFraction('1/3'), parseFraction('1/6'))).toEqual({ num: 1n, den: 2n })
  })

  it('sums cents without float error', () => {
    // 0.1 + 0.2 ≠ 0.3 in floats; exact here
    const sum = add(parseFraction('10/100'), parseFraction('20/100'))
    expect(sum).toEqual({ num: 3n, den: 10n })
    expect(formatRational(sum, 100)).toBe('0.30')
  })
})

describe('neg', () => {
  it('flips the sign', () => {
    expect(neg(parseFraction('5/1'))).toEqual({ num: -5n, den: 1n })
  })
})

describe('toNumber', () => {
  it('converts for display', () => {
    expect(toNumber(parseFraction('5234/100'))).toBeCloseTo(52.34)
  })
})

describe('formatRational', () => {
  it('formats with two decimals for fraction 100', () => {
    expect(formatRational(parseFraction('823666/100'), 100)).toBe('8,236.66')
  })

  it('formats negatives', () => {
    expect(formatRational(parseFraction('-5234/100'), 100)).toBe('-52.34')
  })

  it('rounds half away from zero, exactly', () => {
    expect(formatRational(parseFraction('3167665/1000'), 100)).toBe('3,167.67')
    expect(formatRational(parseFraction('-3167665/1000'), 100)).toBe('-3,167.67')
  })

  it('handles fraction 1000 with three decimals', () => {
    expect(formatRational(parseFraction('130000/1000'), 1000)).toBe('130.000')
  })

  it('formats zero', () => {
    expect(formatRational(parseFraction('0/100'), 100)).toBe('0.00')
  })
})
