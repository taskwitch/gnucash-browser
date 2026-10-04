import { add, isZero, neg, ZERO, type Rational } from './money.ts'
import { rootAccount } from './parser.ts'
import type { Account, AccountType, Book, Split, Transaction } from './types.ts'

export type AccountNature = 'asset' | 'liability' | 'income' | 'expense' | 'equity' | 'other'

export function natureOf(type: AccountType): AccountNature {
  switch (type) {
    case 'ASSET':
    case 'BANK':
    case 'CASH':
    case 'RECEIVABLE':
    case 'STOCK':
    case 'MUTUAL':
      return 'asset'
    case 'LIABILITY':
    case 'CREDIT':
    case 'PAYABLE':
      return 'liability'
    case 'INCOME':
      return 'income'
    case 'EXPENSE':
      return 'expense'
    case 'EQUITY':
      return 'equity'
    default:
      return 'other'
  }
}

export interface RegisterEntry {
  transaction: Transaction
  split: Split
}

export interface BalanceIndex {
  /** accountId → splits on that account, in transaction (date) order */
  registerEntries: Map<string, RegisterEntry[]>
  /** accountId → own balance in the account's commodity */
  own: Map<string, Rational>
  /** accountId → per-commodity totals including descendants */
  total: Map<string, Map<string, Rational>>
}

export function buildBalanceIndex(book: Book): BalanceIndex {
  const registerEntries = new Map<string, RegisterEntry[]>()
  const own = new Map<string, Rational>()

  for (const txn of book.transactions) {
    for (const split of txn.splits) {
      const accountId = split.accountId
      if (!book.accounts.has(accountId)) continue
      let entries = registerEntries.get(accountId)
      if (!entries) {
        entries = []
        registerEntries.set(accountId, entries)
      }
      entries.push({ transaction: txn, split })
      own.set(accountId, add(own.get(accountId) ?? ZERO, split.quantity))
    }
  }

  // Post-order rollup of per-commodity totals from the ROOT account.
  const total = new Map<string, Map<string, Rational>>()
  const visit = (account: Account): Map<string, Rational> => {
    const sums = new Map<string, Rational>()
    const ownBalance = own.get(account.id)
    if (ownBalance && !isZero(ownBalance)) {
      sums.set(account.commodityId, ownBalance)
    }
    for (const childId of account.children) {
      const childAccount = book.accounts.get(childId)
      if (!childAccount) continue
      for (const [commodityId, amount] of visit(childAccount)) {
        sums.set(commodityId, add(sums.get(commodityId) ?? ZERO, amount))
      }
    }
    total.set(account.id, sums)
    return sums
  }
  const root = rootAccount(book)
  if (root) visit(root)
  else for (const account of book.accounts.values()) if (account.parentId === null) visit(account)

  return { registerEntries, own, total }
}

/** Total balance of an account subtree expressed in one commodity. */
export function totalIn(
  index: BalanceIndex,
  accountId: string,
  commodityId: string,
): Rational {
  return index.total.get(accountId)?.get(commodityId) ?? ZERO
}

/** True when a subtree holds value in more than one commodity. */
export function isMixedCurrency(index: BalanceIndex, accountId: string): boolean {
  const sums = index.total.get(accountId)
  if (!sums) return false
  let nonZero = 0
  for (const amount of sums.values()) if (!isZero(amount)) nonZero += 1
  return nonZero > 1
}

/**
 * Applies the display sign convention. Deliberate deviation from raw GnuCash
 * storage: income is stored negative in GnuCash, but shown positive here so
 * Income and Expenses both read as positive magnitudes. Expenses are already
 * stored positive, so nothing to do for them.
 */
export function displayAmount(account: Account, amount: Rational): Rational {
  return account.type === 'INCOME' ? neg(amount) : amount
}

/**
 * Running balances for an account's register entries. The input must be in
 * chronological order (registerEntries already is); returns one balance per
 * entry, aligned by index.
 */
export function runningBalances(entries: RegisterEntry[]): Rational[] {
  const out: Rational[] = []
  let balance = ZERO
  for (const entry of entries) {
    balance = add(balance, entry.split.quantity)
    out.push(balance)
  }
  return out
}

export interface NetWorthSummary {
  assets: Rational
  /** positive = amount owed */
  liabilities: Rational
  netWorth: Rational
  /** commodity ids with non-zero balances excluded from the totals */
  excludedCommodities: string[]
}

/**
 * Assets and liabilities in the book's default currency, from the top-level
 * account branches. Liability balances in GnuCash are positive when money is
 * owed, so net worth = assets − liabilities.
 */
export function netWorthSummary(book: Book, index: BalanceIndex): NetWorthSummary {
  let assets = ZERO
  let liabilities = ZERO
  const excluded = new Set<string>()
  const currency = book.defaultCurrencyId

  const collectExcluded = (account: Account) => {
    if (account.commodityId !== currency) {
      const balance = index.own.get(account.id)
      if (balance && !isZero(balance)) excluded.add(account.commodityId)
    }
    for (const childId of account.children) {
      const childAccount = book.accounts.get(childId)
      if (childAccount) collectExcluded(childAccount)
    }
  }

  const root = rootAccount(book)
  const topLevel = root
    ? root.children
    : [...book.accounts.values()].filter((a) => a.parentId === null).map((a) => a.id)

  for (const id of topLevel) {
    const account = book.accounts.get(id)
    if (!account) continue
    const nature = natureOf(account.type)
    if (nature === 'asset') {
      assets = add(assets, totalIn(index, id, currency))
      collectExcluded(account)
    } else if (nature === 'liability') {
      liabilities = add(liabilities, totalIn(index, id, currency))
      collectExcluded(account)
    }
  }

  return {
    assets,
    liabilities,
    netWorth: add(assets, neg(liabilities)),
    excludedCommodities: [...excluded].sort(),
  }
}
