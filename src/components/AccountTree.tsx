import { useState } from 'react'
import { useBook } from '../state/book-context.tsx'
import { topLevelAccounts } from '../lib/gnucash/parser.ts'
import { displayAmount, isMixedCurrency, totalIn } from '../lib/gnucash/balances.ts'
import type { Account } from '../lib/gnucash/types.ts'
import { Amount } from './Amount.tsx'

export function AccountTree({ onOpenRegister }: { onOpenRegister: (accountId: string) => void }) {
  const { book, index } = useBook()
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(new Set())
  if (!book || !index) return null

  const toggle = (accountId: string) => {
    setCollapsed((previous) => {
      const next = new Set(previous)
      if (next.has(accountId)) next.delete(accountId)
      else next.add(accountId)
      return next
    })
  }

  const renderAccount = (account: Account, depth: number) => {
    const hasChildren = account.children.length > 0
    const isCollapsed = collapsed.has(account.id)
    const fraction = book.commodities.get(account.commodityId)?.fraction ?? 100
    const total = displayAmount(account, totalIn(index, account.id, account.commodityId))
    const mixed = isMixedCurrency(index, account.id)

    return (
      <div key={account.id}>
        <div className="account-row" style={{ paddingLeft: `${depth * 20 + 8}px` }}>
          {hasChildren ? (
            <button
              type="button"
              className="disclosure"
              aria-label={isCollapsed ? `Expand ${account.name}` : `Collapse ${account.name}`}
              aria-expanded={!isCollapsed}
              onClick={() => toggle(account.id)}
            >
              {isCollapsed ? '▸' : '▾'}
            </button>
          ) : (
            <span className="disclosure-spacer" />
          )}
          <button type="button" className="account-name" onClick={() => onOpenRegister(account.id)}>
            {account.name}
            {account.placeholder && <span className="badge">P</span>}
          </button>
          <span className="account-balance">
            <Amount value={total} fraction={fraction} />
            <span className="commodity-code">{account.commodityId}</span>
            {mixed && (
              <span className="mixed-marker" title="Subaccounts in other currencies not included">
                ±
              </span>
            )}
          </span>
        </div>
        {hasChildren &&
          !isCollapsed &&
          account.children.map((childId) => {
            const childAccount = book.accounts.get(childId)
            return childAccount ? renderAccount(childAccount, depth + 1) : null
          })}
      </div>
    )
  }

  return (
    <div className="panel account-tree">
      <div className="panel-heading">Accounts</div>
      <div className="account-row account-header-row">
        <span className="disclosure-spacer" />
        <span className="account-name-header">Account</span>
        <span className="account-balance account-balance-header">Balance</span>
      </div>
      {topLevelAccounts(book).map((account) => renderAccount(account, 0))}
    </div>
  )
}
