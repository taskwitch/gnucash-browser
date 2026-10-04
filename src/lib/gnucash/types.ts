import type { Rational } from './money.ts'

export type AccountType =
  | 'ROOT'
  | 'ASSET'
  | 'BANK'
  | 'CASH'
  | 'RECEIVABLE'
  | 'LIABILITY'
  | 'CREDIT'
  | 'PAYABLE'
  | 'INCOME'
  | 'EXPENSE'
  | 'EQUITY'
  | 'STOCK'
  | 'MUTUAL'
  | 'TRADING'
  | 'OTHER'

export interface Commodity {
  /** e.g. 'EUR', 'USD', or a stock ticker */
  id: string
  /** 'ISO4217' for currencies */
  space: string
  fullname: string
  /** 100 for most currencies; drives display decimals */
  fraction: number
}

export interface Account {
  id: string
  name: string
  type: AccountType
  description: string
  commodityId: string
  /** null only for the hidden ROOT account */
  parentId: string | null
  /** child account ids, in file order */
  children: string[]
  placeholder: boolean
}

export type ReconciledState = 'n' | 'c' | 'y'

export interface Split {
  accountId: string
  memo: string
  reconciledState: ReconciledState
  /** amount in the transaction's currency */
  value: Rational
  /** amount in the account's commodity — this is what balances sum */
  quantity: Rational
}

export interface Transaction {
  id: string
  /** 'YYYY-MM-DD' — kept as a string to avoid timezone bugs */
  datePosted: string
  description: string
  splits: Split[]
}

export interface Book {
  commodities: Map<string, Commodity>
  accounts: Map<string, Account>
  /** sorted by datePosted, stable within a day */
  transactions: Transaction[]
  defaultCurrencyId: string
  loadedAt: string
  fileName: string
}
