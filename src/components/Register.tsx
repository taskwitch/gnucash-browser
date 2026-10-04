import { useMemo, useState } from 'react'
import { useBook } from '../state/book-context.tsx'
import { runningBalances, type RegisterEntry } from '../lib/gnucash/balances.ts'
import { formatDate } from '../lib/gnucash/dates.ts'
import type { Rational } from '../lib/gnucash/money.ts'
import { Amount } from './Amount.tsx'

const RECONCILED_LABEL: Record<string, string> = { n: '', c: 'C', y: 'R' }

export function Register({ accountId, onBack }: { accountId: string; onBack: () => void }) {
  const { book, index } = useBook()
  const [query, setQuery] = useState('')

  const account = book?.accounts.get(accountId)
  const rows = useMemo(() => {
    if (!index) return []
    const entries = index.registerEntries.get(accountId) ?? []
    const balances = runningBalances(entries)
    const paired: { entry: RegisterEntry; balance: Rational }[] = entries.map((entry, i) => ({
      entry,
      balance: balances[i]!,
    }))
    paired.reverse() // newest first; balances were computed chronologically
    return paired
  }, [index, accountId])

  if (!book || !index || !account) return null
  const fraction = book.commodities.get(account.commodityId)?.fraction ?? 100

  const q = query.trim().toLowerCase()
  const filtered = q
    ? rows.filter(
        ({ entry }) =>
          entry.transaction.description.toLowerCase().includes(q) ||
          entry.split.memo.toLowerCase().includes(q),
      )
    : rows

  return (
    <div className="panel register">
      <div className="panel-heading register-heading">
        <button type="button" className="button back-button" onClick={onBack}>
          ◂ Accounts
        </button>
        <span className="register-title">
          {account.name} <span className="commodity-code">{account.commodityId}</span>
        </span>
        <input
          type="search"
          className="register-search"
          placeholder="Search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search transactions"
        />
      </div>
      <div className="register-scroll">
        <table className="ledger-table">
          <thead>
            <tr>
              <th className="col-date">Date</th>
              <th>Description</th>
              <th className="col-reconciled" title="Reconciled">
                R
              </th>
              <th className="col-amount">Amount</th>
              <th className="col-amount">Balance</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(({ entry, balance }, i) => (
              <tr key={`${entry.transaction.id}-${i}`}>
                <td className="col-date">{formatDate(entry.transaction.datePosted)}</td>
                <td>
                  {entry.transaction.description}
                  {entry.split.memo && <div className="memo">{entry.split.memo}</div>}
                </td>
                <td className="col-reconciled">{RECONCILED_LABEL[entry.split.reconciledState]}</td>
                <td className="col-amount">
                  <Amount value={entry.split.quantity} fraction={fraction} />
                </td>
                <td className="col-amount">
                  <Amount value={balance} fraction={fraction} />
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="empty-cell">
                  {q ? 'No transactions match the search.' : 'No transactions in this account.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
