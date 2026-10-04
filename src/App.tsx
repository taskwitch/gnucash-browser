import { useState, type ChangeEvent } from 'react'
import { useBook } from './state/book-context.tsx'
import { formatLoadedAt } from './lib/gnucash/dates.ts'
import { AccountTree } from './components/AccountTree.tsx'
import { Dashboard } from './components/Dashboard.tsx'
import { FileLoader, FILE_ACCEPT } from './components/FileLoader.tsx'
import { Register } from './components/Register.tsx'
import { Reports } from './components/Reports.tsx'
import { TabBar, type Tab } from './components/TabBar.tsx'

type View = { kind: 'accounts' } | { kind: 'register'; accountId: string } | { kind: 'reports' } | { kind: 'dashboard' }

export default function App() {
  const { status, book, error, restoredFromStorage, loadFile, forget, dismissError } = useBook()
  const [view, setView] = useState<View>({ kind: 'accounts' })

  const activeTab: Tab = view.kind === 'register' ? 'accounts' : view.kind

  const onHeaderFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (file) void loadFile(file)
  }

  if (status === 'loading') {
    return (
      <div className="app app-splash">
        <p>Loading…</p>
      </div>
    )
  }

  if (status === 'empty' || (status === 'parsing' && !book)) {
    return (
      <div className="app">
        <FileLoader />
      </div>
    )
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-header-text">
          <span className="app-header-title">GnuCash Browser</span>
          {book && (
            <span className="app-header-sub">
              {book.fileName} · {restoredFromStorage ? 'saved data from' : 'loaded'}{' '}
              {formatLoadedAt(book.loadedAt)}
            </span>
          )}
        </div>
        <div className="app-header-actions">
          <label className="button button-small">
            Load new file
            <input type="file" accept={FILE_ACCEPT} onChange={onHeaderFile} hidden />
          </label>
          <button type="button" className="button button-small" onClick={() => void forget()}>
            Forget data
          </button>
        </div>
      </header>

      {status === 'parsing' && (
        <div className="banner banner-info" role="status">
          Reading new file…
        </div>
      )}
      {error && (
        <div className="banner banner-error" role="alert">
          {error}
          <button type="button" className="banner-dismiss" onClick={dismissError}>
            Dismiss
          </button>
        </div>
      )}

      <main className="app-main">
        {view.kind === 'accounts' && (
          <AccountTree onOpenRegister={(accountId) => setView({ kind: 'register', accountId })} />
        )}
        {view.kind === 'register' && (
          <Register accountId={view.accountId} onBack={() => setView({ kind: 'accounts' })} />
        )}
        {view.kind === 'reports' && <Reports />}
        {view.kind === 'dashboard' && <Dashboard />}
      </main>

      <TabBar active={activeTab} onSelect={(tab) => setView({ kind: tab })} />
    </div>
  )
}
