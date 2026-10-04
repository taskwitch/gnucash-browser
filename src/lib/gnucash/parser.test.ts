import { describe, expect, it } from 'vitest'
import { gzipSync } from 'node:zlib'
import { TextEncoder } from 'node:util'
import { decodeGnuCashBytes, NotGnuCashFileError } from './decompress.ts'
import { parseBook, rootAccount, topLevelAccounts } from './parser.ts'
import sampleXml from './__fixtures__/sample.gnucash.xml?raw'

const book = parseBook(sampleXml, 'sample.gnucash', '2024-03-16T00:00:00.000Z')

describe('decompress', () => {
  it('passes through plain XML', () => {
    const bytes = new TextEncoder().encode(sampleXml)
    expect(decodeGnuCashBytes(bytes)).toBe(sampleXml)
  })

  it('decompresses gzipped XML', () => {
    const bytes = gzipSync(new TextEncoder().encode(sampleXml))
    expect(decodeGnuCashBytes(bytes)).toBe(sampleXml)
  })

  it('rejects SQLite-format files with a specific message', () => {
    const bytes = new TextEncoder().encode('SQLite format 3\0rest of file')
    expect(() => decodeGnuCashBytes(bytes, 'data.gnucash')).toThrowError(/SQLite/)
  })

  it('rejects garbage input', () => {
    const bytes = new TextEncoder().encode('this is not a book')
    expect(() => decodeGnuCashBytes(bytes, 'notes.txt')).toThrowError(NotGnuCashFileError)
  })
})

describe('parseBook', () => {
  it('parses commodities', () => {
    expect(book.commodities.size).toBe(2)
    expect(book.commodities.get('EUR')).toMatchObject({ fullname: 'Euro', fraction: 100 })
  })

  it('parses all accounts', () => {
    expect(book.accounts.size).toBe(13)
  })

  it('identifies the hidden root and top-level accounts', () => {
    const root = rootAccount(book)
    expect(root?.name).toBe('Root Account')
    expect(topLevelAccounts(book).map((a) => a.name)).toEqual([
      'Assets',
      'Liabilities',
      'Income',
      'Expenses',
      'Equity',
    ])
  })

  it('wires the account tree', () => {
    const assets = [...book.accounts.values()].find((a) => a.name === 'Assets')!
    expect(assets.children.map((id) => book.accounts.get(id)!.name)).toEqual([
      'Checking',
      'Wallet USD',
    ])
    const checking = book.accounts.get(assets.children[0]!)!
    expect(checking.parentId).toBe(assets.id)
  })

  it('reads placeholder flags from slots', () => {
    const byName = (n: string) => [...book.accounts.values()].find((a) => a.name === n)!
    expect(byName('Assets').placeholder).toBe(true)
    expect(byName('Checking').placeholder).toBe(false)
  })

  it('parses split amounts as exact rationals', () => {
    const txn = book.transactions.find((t) => t.description === 'Cash withdrawal USD')!
    const usdSplit = txn.splits.find((s) => {
      const account = book.accounts.get(s.accountId)
      return account?.commodityId === 'USD'
    })!
    expect(usdSplit.quantity).toEqual({ num: 130n, den: 1n })
    expect(usdSplit.value).toEqual({ num: 100n, den: 1n })
  })

  it('extracts date-only strings', () => {
    expect(book.transactions[0]?.datePosted).toBe('2024-01-01')
  })

  it('reads reconciled state and memo', () => {
    const txn = book.transactions.find((t) => t.description === 'Grocery Store')!
    const checkingSplit = txn.splits[0]!
    expect(checkingSplit.reconciledState).toBe('y')
    const grocerySplit = txn.splits[1]!
    expect(grocerySplit.memo).toBe('weekly shop')
  })

  it('sorts transactions by date and ignores template transactions', () => {
    expect(book.transactions).toHaveLength(9)
    expect(book.transactions.some((t) => t.description.includes('template'))).toBe(false)
    const dates = book.transactions.map((t) => t.datePosted)
    expect([...dates].sort()).toEqual(dates)
  })

  it('picks the default currency from the first top-level account', () => {
    expect(book.defaultCurrencyId).toBe('EUR')
  })

  it('rejects XML without a book element', () => {
    expect(() => parseBook('<html><body>hi</body></html>', 'x.xml')).toThrowError(/gnc:book/)
  })
})
