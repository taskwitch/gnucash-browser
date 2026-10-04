import { describe, expect, it } from 'vitest'
import { parseBook } from './parser.ts'
import {
  buildBalanceIndex,
  displayAmount,
  isMixedCurrency,
  netWorthSummary,
  runningBalances,
  totalIn,
} from './balances.ts'
import { monthlyIncomeExpense, monthRange, netWorthSeries } from './reports.ts'
import { formatRational } from './money.ts'
import type { Account } from './types.ts'
import sampleXml from './__fixtures__/sample.gnucash.xml?raw'

const book = parseBook(sampleXml, 'sample.gnucash', '2024-03-16T00:00:00.000Z')
const index = buildBalanceIndex(book)
const byName = (n: string): Account => [...book.accounts.values()].find((a) => a.name === n)!
const fmt = (r: Parameters<typeof formatRational>[0]) => formatRational(r, 100)

describe('balances', () => {
  it('computes own balances from split quantities', () => {
    expect(fmt(index.own.get(byName('Checking').id)!)).toBe('8,236.66')
    expect(fmt(index.own.get(byName('Credit Card').id)!)).toBe('30.00')
  })

  it('keeps foreign-currency balances in their own commodity', () => {
    expect(fmt(index.own.get(byName('Wallet USD').id)!)).toBe('130.00')
  })

  it('rolls up subtree totals per commodity', () => {
    const assets = byName('Assets')
    expect(fmt(totalIn(index, assets.id, 'EUR'))).toBe('8,236.66')
    expect(fmt(totalIn(index, assets.id, 'USD'))).toBe('130.00')
    expect(isMixedCurrency(index, assets.id)).toBe(true)
    expect(isMixedCurrency(index, byName('Checking').id)).toBe(false)
  })

  it('flips income sign for display only', () => {
    const salary = byName('Salary')
    const stored = index.own.get(salary.id)!
    expect(fmt(stored)).toBe('-7,500.00')
    expect(fmt(displayAmount(salary, stored))).toBe('7,500.00')
    // expenses are already stored positive — no flip
    const groceries = byName('Groceries')
    const groceryBalance = index.own.get(groceries.id)!
    expect(fmt(displayAmount(groceries, groceryBalance))).toBe('163.34')
  })

  it('computes exact running balances', () => {
    const checking = byName('Checking')
    const entries = index.registerEntries.get(checking.id)!
    const balances = runningBalances(entries)
    expect(fmt(balances[balances.length - 1]!)).toBe('8,236.66')
    expect(fmt(balances[0]!)).toBe('1,000.00')
    expect(fmt(balances[2]!)).toBe('3,447.66')
  })

  it('summarizes net worth in the default currency', () => {
    const summary = netWorthSummary(book, index)
    expect(fmt(summary.assets)).toBe('8,236.66')
    expect(fmt(summary.liabilities)).toBe('30.00')
    expect(fmt(summary.netWorth)).toBe('8,206.66')
    expect(summary.excludedCommodities).toEqual(['USD'])
  })
})

describe('reports', () => {
  it('generates inclusive month ranges', () => {
    expect(monthRange('2023-11', '2024-02')).toEqual(['2023-11', '2023-12', '2024-01', '2024-02'])
  })

  it('buckets income and expenses by month as positive magnitudes', () => {
    const flows = monthlyIncomeExpense(book, 12)
    expect(flows).toHaveLength(12)
    expect(flows[0]?.month).toBe('2023-04')
    expect(flows[11]?.month).toBe('2024-03')
    const jan = flows.find((f) => f.month === '2024-01')!
    expect(fmt(jan.income)).toBe('2,500.00')
    expect(fmt(jan.expenses)).toBe('52.34')
    const feb = flows.find((f) => f.month === '2024-02')!
    expect(fmt(feb.income)).toBe('2,500.00')
    expect(fmt(feb.expenses)).toBe('80.00')
    const may = flows.find((f) => f.month === '2023-05')!
    expect(fmt(may.income)).toBe('0.00')
  })

  it('builds a cumulative net worth series', () => {
    const series = netWorthSeries(book)
    expect(series.map((p) => p.month)).toEqual(['2024-01', '2024-02', '2024-03'])
    expect(fmt(series[0]!.value)).toBe('3,447.66')
    expect(fmt(series[1]!.value)).toBe('5,767.66')
    expect(fmt(series[2]!.value)).toBe('8,206.66')
  })
})
