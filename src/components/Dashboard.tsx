import { useBook } from '../state/book-context.tsx'
import { natureOf, netWorthSummary } from '../lib/gnucash/balances.ts'
import { formatDate } from '../lib/gnucash/dates.ts'
import { add, isZero, ZERO, type Rational } from '../lib/gnucash/money.ts'
import type { Transaction } from '../lib/gnucash/types.ts'
import { Amount } from './Amount.tsx'

export function Dashboard() {
  const { book, index } = useBook()
  if (!book || !index) return null

  const fraction = book.commodities.get(book.defaultCurrencyId)?.fraction ?? 100
  const currency = book.defaultCurrencyId
  const summary = netWorthSummary(book, index)

  /** Amount of a transaction touching asset/liability accounts in the default currency. */
  const transactionAmount = (txn: Transaction): Rational => {
    let total = ZERO
    for (const split of txn.splits) {
      const account = book.accounts.get(split.accountId)
      if (!account || account.commodityId !== currency) continue
      const nature = natureOf(account.type)
      if (nature === 'asset' || nature === 'liability') total = add(total, split.quantity)
    }
    return total
  }

  const recent = book.transactions.slice(-10).reverse()

  return (
    <div className="dashboard">
      <div className="stat-panels">
        <div className="panel stat-panel">
          <div className="stat-label">Assets</div>
          <div className="stat-value">
            <Amount value={summary.assets} fraction={fraction} />
            <span className="commodity-code">{currency}</span>
          </div>
        </div>
        <div className="panel stat-panel">
          <div className="stat-label">Liabilities</div>
          <div className="stat-value">
            <Amount value={summary.liabilities} fraction={fraction} />
            <span className="commodity-code">{currency}</span>
          </div>
        </div>
        <div className="panel stat-panel">
          <div className="stat-label">Net Worth</div>
          <div className="stat-value">
            <Amount value={summary.netWorth} fraction={fraction} />
            <span className="commodity-code">{currency}</span>
          </div>
        </div>
      </div>
      {summary.excludedCommodities.length > 0 && (
        <p className="footnote">
          Totals exclude accounts in {summary.excludedCommodities.join(', ')}.
        </p>
      )}

      <div className="panel">
        <div className="panel-heading">Recent Transactions</div>
        <table className="ledger-table">
          <thead>
            <tr>
              <th className="col-date">Date</th>
              <th>Description</th>
              <th className="col-amount">Amount</th>
            </tr>
          </thead>
          <tbody>
            {recent.map((txn) => {
              const amount = transactionAmount(txn)
              return (
                <tr key={txn.id}>
                  <td className="col-date">{formatDate(txn.datePosted)}</td>
                  <td>{txn.description}</td>
                  <td className="col-amount">
                    {isZero(amount) ? '—' : <Amount value={amount} fraction={fraction} />}
                  </td>
                </tr>
              )
            })}
            {recent.length === 0 && (
              <tr>
                <td colSpan={3} className="empty-cell">
                  No transactions in this book.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
