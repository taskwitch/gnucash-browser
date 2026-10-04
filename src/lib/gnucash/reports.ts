import { add, neg, ZERO, type Rational } from './money.ts'
import { natureOf } from './balances.ts'
import type { Book } from './types.ts'

export interface MonthlyFlow {
  /** 'YYYY-MM' */
  month: string
  /** positive magnitudes */
  income: Rational
  expenses: Rational
}

export interface NetWorthPoint {
  month: string
  value: Rational
}

/** Inclusive list of 'YYYY-MM' months from start to end. */
export function monthRange(start: string, end: string): string[] {
  const out: string[] = []
  let [y, m] = start.split('-').map(Number) as [number, number]
  const [endY, endM] = end.split('-').map(Number) as [number, number]
  while (y < endY || (y === endY && m <= endM)) {
    out.push(`${y}-${String(m).padStart(2, '0')}`)
    m += 1
    if (m > 12) {
      m = 1
      y += 1
    }
  }
  return out
}

function shiftMonth(month: string, delta: number): string {
  let [y, m] = month.split('-').map(Number) as [number, number]
  m += delta
  while (m <= 0) {
    m += 12
    y -= 1
  }
  while (m > 12) {
    m -= 12
    y += 1
  }
  return `${y}-${String(m).padStart(2, '0')}`
}

/** Latest month that contains a transaction, or null for an empty book. */
function latestMonth(book: Book): string | null {
  const last = book.transactions[book.transactions.length - 1]
  return last ? last.datePosted.slice(0, 7) : null
}

/**
 * Income vs expenses per month, in the default currency, for the `count`
 * months ending at the latest transaction month. Income is stored negative
 * in GnuCash; both series come out as positive magnitudes.
 */
export function monthlyIncomeExpense(book: Book, count = 12): MonthlyFlow[] {
  const end = latestMonth(book)
  if (!end) return []
  const months = monthRange(shiftMonth(end, -(count - 1)), end)
  const buckets = new Map<string, MonthlyFlow>()
  for (const month of months) buckets.set(month, { month, income: ZERO, expenses: ZERO })

  const currency = book.defaultCurrencyId
  for (const txn of book.transactions) {
    const bucket = buckets.get(txn.datePosted.slice(0, 7))
    if (!bucket) continue
    for (const split of txn.splits) {
      const account = book.accounts.get(split.accountId)
      if (!account || account.commodityId !== currency) continue
      const nature = natureOf(account.type)
      if (nature === 'income') {
        bucket.income = add(bucket.income, neg(split.quantity))
      } else if (nature === 'expense') {
        bucket.expenses = add(bucket.expenses, split.quantity)
      }
    }
  }
  return months.map((m) => buckets.get(m)!)
}

/**
 * Cumulative net worth at each month-end, default-currency accounts only:
 * asset balances add, liability balances (positive = owed) subtract.
 */
export function netWorthSeries(book: Book): NetWorthPoint[] {
  const first = book.transactions[0]
  const end = latestMonth(book)
  if (!first || !end) return []
  const months = monthRange(first.datePosted.slice(0, 7), end)

  const deltas = new Map<string, Rational>()
  const currency = book.defaultCurrencyId
  for (const txn of book.transactions) {
    const month = txn.datePosted.slice(0, 7)
    for (const split of txn.splits) {
      const account = book.accounts.get(split.accountId)
      if (!account || account.commodityId !== currency) continue
      const nature = natureOf(account.type)
      if (nature !== 'asset' && nature !== 'liability') continue
      const delta = nature === 'asset' ? split.quantity : neg(split.quantity)
      deltas.set(month, add(deltas.get(month) ?? ZERO, delta))
    }
  }

  let cumulative = ZERO
  return months.map((month) => {
    cumulative = add(cumulative, deltas.get(month) ?? ZERO)
    return { month, value: cumulative }
  })
}
